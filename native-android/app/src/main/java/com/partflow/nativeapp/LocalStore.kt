package com.partflow.nativeapp

import android.content.Context
import androidx.room.*
import kotlinx.coroutines.flow.Flow

@Entity(tableName = "snapshots", primaryKeys = ["account", "scope"])
data class CachedPage(val account: String, val scope: String, val payload: String, val savedAt: Long)
@Entity(tableName = "drafts", primaryKeys = ["account", "scope"])
data class Draft(val account: String, val scope: String, val payload: String)
@Dao
interface LocalDao {
    @Query("SELECT * FROM snapshots WHERE account=:account AND scope=:scope")
    suspend fun page(account: String, scope: String): CachedPage?
    @Upsert suspend fun save(page: CachedPage)
    @Query("DELETE FROM snapshots WHERE account=:account") suspend fun clearPages(account: String)
    @Query("DELETE FROM snapshots WHERE savedAt < :before") suspend fun prune(before: Long)
    @Query("SELECT * FROM drafts WHERE account=:account AND scope=:scope") suspend fun draft(account: String, scope: String): Draft?
    @Upsert suspend fun saveDraft(draft: Draft)
    @Query("DELETE FROM drafts WHERE account=:account") suspend fun clearDrafts(account: String)
    @Query("DELETE FROM drafts WHERE account=:account AND scope=:scope") suspend fun deleteDraft(account: String, scope: String)
}
@Database(entities = [CachedPage::class, Draft::class], version = 1, exportSchema = true)
abstract class LocalStore : RoomDatabase() {
    abstract fun dao(): LocalDao
    companion object {
        fun open(context: Context) = Room.databaseBuilder(context, LocalStore::class.java, "partflow.db").build()
    }
}
