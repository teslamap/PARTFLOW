package com.partflow.nativeapp

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.Query
import com.google.firebase.firestore.Source
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.*

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
    private var pageLimit = 50L
    private var pending = false
    private val authListener = FirebaseAuth.AuthStateListener { auth ->
        val previous = user.value?.uid
        user.value = auth.currentUser
        if(previous != auth.currentUser?.uid) {
            stop(); rows.value=emptyList(); member.value=null
            profileJob?.cancel()
            if(auth.currentUser != null) profileJob = viewModelScope.launch {
                try {
                    repo.member()
                    repo.profile().collect { m ->
                        val old = member.value
                        member.value=m
                        if(old != null && old.s("role")!=m?.s("role")) {
                            stop(); rows.value=emptyList(); repo.local.clearPages(repo.uid)
                        }
                    }
                } catch(e: Exception) { if(e is CancellationException)throw e; notice.value=e.localizedMessage.orEmpty() }
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
        if(reset)pageLimit=50
        rows.value=emptyList(); cached.value=false; more.value=false
        val account=repo.uid; val g=generation
        active=viewModelScope.launch {
            try {
                val saved=repo.cached(feed.key,account)
                if(g==generation) { rows.value=saved; cached.value=saved.isNotEmpty() }
                repo.watch(feed.query.limit(pageLimit)).collect { p ->
                    if(g!=generation || repo.auth.currentUser?.uid!=account)return@collect
                    // Initial empty SDK memory snapshots must not erase durable offline data.
                    if(!p.cached || p.records.isNotEmpty())rows.value=p.records
                    cached.value=p.cached; more.value=p.records.size>=pageLimit; pending=p.pending
                    if(!p.cached && !p.pending)repo.saveCache(feed.key,p.records,account)
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
    fun loadMore() { if(pageLimit<500 && !busy.value) { pageLimit+=50; bound?.let { bind(it,false) } } }
    fun logout() {
        if(busy.value) { notice.value="დაელოდე მიმდინარე მოქმედებას"; return }
        val account=repo.uid
        stop(); rows.value=emptyList(); member.value=null
        run({ repo.local.clearPages(account); repo.local.clearDrafts(account); repo.auth.signOut() })
    }
    override fun onCleared() { stop(); profileJob?.cancel(); repo.auth.removeAuthStateListener(authListener) }
}
