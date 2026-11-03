package com.partflow.nativeapp

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.Query
import com.google.firebase.firestore.Source
import com.google.firebase.firestore.DocumentSnapshot
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.tasks.await

data class Feed(val key: String, val title: String, val query: Query)
class AppModel(application: Application) : AndroidViewModel(application) {
    val repo = (application as PartflowApplication).repository
    var user = MutableStateFlow(repo.auth.currentUser)
    val member = MutableStateFlow<Record?>(null)
    val rows = MutableStateFlow<List<Record>>(emptyList())
    val notice = MutableStateFlow("")
    val busy = MutableStateFlow(false)
    val cached = MutableStateFlow(false)
    val more = MutableStateFlow(false)
    private var active: Job? = null
    private var profileJob: Job? = null
    private var generation = 0
    private var bound: Feed? = null
    private var cursor: DocumentSnapshot? = null
    private var older = emptyList<Record>()
    private var pending = false
    private val authListener = FirebaseAuth.AuthStateListener { auth ->
        val previous = user.value?.uid
        user.value = auth.currentUser
        if(previous != auth.currentUser?.uid) {
            stop(); rows.value=emptyList(); member.value=null
            profileJob?.cancel()
            if(auth.currentUser != null) profileJob = viewModelScope.launch {
                try {
                    val account=repo.uid
                    repo.cached("_member",account).firstOrNull()?.let { if(!repo.admin)member.value=it }
                    withTimeoutOrNull(8000) { repo.member() }
                    repo.profile().collect { m ->
                        val old = member.value
                        member.value=m
                        if(m!=null)repo.saveCache("_member",listOf(m),account)
                        if(old != null && old.s("role")!=m?.s("role")) {
                            stop(); rows.value=emptyList(); repo.local.clearPages(repo.uid)
                        }
                    }
                } catch(e: Exception) { if(e is CancellationException)throw e; member.value=null; stop(); rows.value=emptyList(); notice.value=e.localizedMessage.orEmpty() }
            }
        }
    }
    init {
        // Force initial profile initialization even when Firebase restored a session.
        user.value=null
        repo.auth.addAuthStateListener(authListener)
    }
    fun run(action: suspend () -> Unit, done: () -> Unit = {}) {
        if(busy.value)return
        viewModelScope.launch {
            busy.value=true; notice.value=""
            try { action(); notice.value="შენახულია"; done() }
            catch(e: Exception) { if(e is CancellationException)throw e; notice.value=e.localizedMessage ?: "მოქმედება ვერ შესრულდა" }
            finally { busy.value=false }
        }
    }
    fun stop() { generation++; active?.cancel(); active=null }
    fun bind(feed: Feed, reset: Boolean = true) {
        stop(); bound=feed
        if(reset) { cursor=null; older=emptyList() }
        rows.value=emptyList(); cached.value=false; more.value=false
        val account=repo.uid; val g=generation
        active=viewModelScope.launch {
            try {
                val saved=repo.cached(feed.key,account)
                if(g==generation) { rows.value=saved; cached.value=saved.isNotEmpty() }
                repo.watch(feed.query.limit(50)).collect { p ->
                    if(g!=generation || repo.auth.currentUser?.uid!=account)return@collect
                    // Initial empty SDK memory snapshots must not erase durable offline data.
                    if(!p.cached || p.records.isNotEmpty())rows.value=(p.records+older).distinctBy{it.path}
                    if(older.isEmpty()) { cursor=p.cursor; more.value=p.records.size>=50 }
                    cached.value=p.cached; pending=p.pending
                    if(!p.cached && !p.pending)repo.saveCache(feed.key,rows.value,account)
                }
            } catch(e: Exception) {
                if(e is CancellationException)throw e
                if(g==generation) {
                    rows.value=emptyList(); notice.value=e.localizedMessage.orEmpty()
                    // Never retain privileged data after a rejected query.
                    repo.local.clearPages(account)
                }
            }
        }
    }
    fun loadMore() {
        val last=cursor ?: return
        val feed=bound ?: return
        val g=generation; val account=repo.uid
        run({
            val next=feed.query.startAfter(last).limit(50).get(Source.SERVER).await()
            if(g==generation && repo.auth.currentUser?.uid==account) {
                older=(older+next.documents.map{it.record()}).distinctBy{it.path}
                rows.value=(rows.value+older).distinctBy{it.path}
                cursor=next.documents.lastOrNull(); more.value=next.size()==50
                repo.saveCache(feed.key,rows.value,account)
            }
        })
    }
    fun logout() {
        if(busy.value) { notice.value="დაელოდე მიმდინარე მოქმედებას"; return }
        val account=repo.uid
        stop(); rows.value=emptyList(); member.value=null
        run({ repo.local.clearPages(account); repo.local.clearDrafts(account); repo.auth.signOut() })
    }
    override fun onCleared() { stop(); profileJob?.cancel(); repo.auth.removeAuthStateListener(authListener) }
}
