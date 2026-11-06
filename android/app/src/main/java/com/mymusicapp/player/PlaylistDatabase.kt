package com.mymusicapp.player

import android.content.Context
import androidx.room.Dao
import androidx.room.Database
import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.Insert
import androidx.room.PrimaryKey
import androidx.room.Query
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.Update
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase

@Entity(tableName = "playlists")
data class PlaylistEntity(
  @PrimaryKey val id: String,
  val name: String,
  val createdAt: Long,
)

@Entity(
  tableName = "playlist_tracks",
  primaryKeys = ["playlistId", "position"],
  indices = [Index(value = ["playlistId", "trackId"], unique = true)],
  foreignKeys = [
    ForeignKey(
      entity = PlaylistEntity::class,
      parentColumns = ["id"],
      childColumns = ["playlistId"],
      onDelete = ForeignKey.CASCADE,
    ),
  ],
)
data class PlaylistTrackEntity(
  val playlistId: String,
  val trackId: String,
  val position: Int,
)

@Entity(
  tableName = "playback_history",
  indices = [Index(value = ["trackId"]), Index(value = ["playedAt"])],
)
data class PlaybackHistoryEntity(
  @PrimaryKey(autoGenerate = true) val id: Long = 0,
  val trackId: String,
  val playedAt: Long,
)

@Dao
interface PlaylistDao {
  @Query("SELECT * FROM playlists ORDER BY createdAt, name COLLATE NOCASE")
  suspend fun getPlaylists(): List<PlaylistEntity>

  @Query("SELECT * FROM playlist_tracks ORDER BY playlistId, position")
  suspend fun getPlaylistTracks(): List<PlaylistTrackEntity>

  @Query("SELECT * FROM playlists WHERE id = :playlistId LIMIT 1")
  suspend fun getPlaylist(playlistId: String): PlaylistEntity?

  @Insert
  suspend fun insertPlaylist(playlist: PlaylistEntity)

  @Update
  suspend fun updatePlaylist(playlist: PlaylistEntity)

  @Query("DELETE FROM playlists WHERE id = :playlistId")
  suspend fun deletePlaylist(playlistId: String)

  @Query("DELETE FROM playlist_tracks WHERE playlistId = :playlistId")
  suspend fun deletePlaylistTracks(playlistId: String)

  @Query("DELETE FROM playlist_tracks WHERE trackId = :trackId")
  suspend fun deletePlaylistTrackReferences(trackId: String)

  @Insert
  suspend fun insertPlaylistTracks(tracks: List<PlaylistTrackEntity>)

  @Insert
  suspend fun insertPlaybackHistory(entry: PlaybackHistoryEntity)

  @Query(
    "SELECT trackId, MAX(playedAt) AS playedAt FROM playback_history " +
      "GROUP BY trackId ORDER BY playedAt DESC, trackId ASC LIMIT 100",
  )
  suspend fun getRecentPlayback(): List<RecentPlaybackEntry>

  @Query(
    "DELETE FROM playback_history WHERE id NOT IN " +
      "(SELECT id FROM playback_history ORDER BY playedAt DESC, id DESC LIMIT 500)",
  )
  suspend fun prunePlaybackHistory()

  @Query("DELETE FROM playback_history WHERE trackId = :trackId")
  suspend fun deletePlaybackHistoryForTrack(trackId: String)

  @Query("DELETE FROM playback_history")
  suspend fun clearPlaybackHistory()
}

data class RecentPlaybackEntry(
  val trackId: String,
  val playedAt: Long,
)

@Database(
  entities = [
    PlaylistEntity::class,
    PlaylistTrackEntity::class,
    PlaybackHistoryEntity::class,
  ],
  version = 2,
  exportSchema = false,
)
abstract class PlaylistDatabase : RoomDatabase() {
  abstract fun playlistDao(): PlaylistDao

  companion object {
    private val MIGRATION_1_2 = object : Migration(1, 2) {
      override fun migrate(db: SupportSQLiteDatabase) {
        db.execSQL(
          "CREATE TABLE IF NOT EXISTS `playback_history` " +
            "(`id` INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, " +
            "`trackId` TEXT NOT NULL, `playedAt` INTEGER NOT NULL)",
        )
        db.execSQL(
          "CREATE INDEX IF NOT EXISTS `index_playback_history_trackId` " +
            "ON `playback_history` (`trackId`)",
        )
        db.execSQL(
          "CREATE INDEX IF NOT EXISTS `index_playback_history_playedAt` " +
            "ON `playback_history` (`playedAt`)",
        )
      }
    }

    @Volatile
    private var instance: PlaylistDatabase? = null

    fun getInstance(context: Context): PlaylistDatabase =
      instance ?: synchronized(this) {
        instance ?: Room.databaseBuilder(
          context.applicationContext,
          PlaylistDatabase::class.java,
          "playlists.db",
        ).addMigrations(MIGRATION_1_2).build().also { instance = it }
      }
  }
}
