// ============================================================================
// Anything Download Manager — Database Models & Mappings
// ============================================================================

import type {
  DownloadTask,
  DownloadSegment,
  TorrentTask,
  DownloadStatus,
  DownloadCategory,
  SegmentStatus,
  TorrentStatus,
} from '../../shared/types';

export interface DbDownloadRow {
  id: string;
  url: string;
  file_name: string;
  save_path: string;
  total_size: number;
  downloaded_size: number;
  status: string;
  category: string;
  segment_count: number;
  speed: number;
  average_speed: number;
  progress: number;
  resumable: number;
  mime_type: string | null;
  referrer: string | null;
  headers: string | null;
  error: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface DbSegmentRow {
  id: number;
  download_id: string;
  segment_index: number;
  start_byte: number;
  end_byte: number;
  downloaded_bytes: number;
  status: string;
  temp_file_path: string;
}

export interface DbTorrentRow {
  id: string;
  name: string;
  info_hash: string;
  magnet_uri: string | null;
  torrent_file_path: string | null;
  save_path: string;
  total_size: number;
  downloaded_size: number;
  uploaded_size: number;
  status: string;
  progress: number;
  created_at: string;
  completed_at: string | null;
  error: string | null;
}

export function dbRowToDownloadTask(
  row: DbDownloadRow,
  segmentRows: DbSegmentRow[] = []
): DownloadTask {
  const segments: DownloadSegment[] = segmentRows.map((s) => ({
    id: s.id,
    downloadId: s.download_id,
    index: s.segment_index,
    startByte: s.start_byte,
    endByte: s.end_byte,
    downloadedBytes: s.downloaded_bytes,
    status: s.status as SegmentStatus,
    speed: 0,
    tempFilePath: s.temp_file_path,
  }));

  let headers: Record<string, string> = {};
  if (row.headers) {
    try {
      headers = JSON.parse(row.headers);
    } catch {
      // ignore
    }
  }

  return {
    id: row.id,
    url: row.url,
    fileName: row.file_name,
    savePath: row.save_path,
    totalSize: row.total_size,
    downloadedSize: row.downloaded_size,
    status: row.status as DownloadStatus,
    category: row.category as DownloadCategory,
    segments,
    segmentCount: row.segment_count,
    speed: row.speed || 0,
    averageSpeed: row.average_speed || 0,
    progress: row.progress || 0,
    resumable: Boolean(row.resumable),
    mimeType: row.mime_type,
    referrer: row.referrer,
    headers,
    error: row.error,
    createdAt: row.created_at,
    completedAt: row.completed_at,
  };
}

export function downloadTaskToDbRow(task: DownloadTask): DbDownloadRow {
  return {
    id: task.id,
    url: task.url,
    file_name: task.fileName,
    save_path: task.savePath,
    total_size: task.totalSize,
    downloaded_size: task.downloadedSize,
    status: task.status,
    category: task.category,
    segment_count: task.segmentCount,
    speed: task.speed,
    average_speed: task.averageSpeed,
    progress: task.progress,
    resumable: task.resumable ? 1 : 0,
    mime_type: task.mimeType,
    referrer: task.referrer,
    headers: JSON.stringify(task.headers || {}),
    error: task.error,
    created_at: task.createdAt,
    completed_at: task.completedAt,
  };
}

export function dbRowToTorrentTask(row: DbTorrentRow): TorrentTask {
  return {
    id: row.id,
    name: row.name,
    infoHash: row.info_hash,
    magnetURI: row.magnet_uri,
    torrentFilePath: row.torrent_file_path,
    savePath: row.save_path,
    totalSize: row.total_size,
    downloadedSize: row.downloaded_size,
    uploadedSize: row.uploaded_size,
    status: row.status as TorrentStatus,
    progress: row.progress,
    downloadSpeed: 0,
    uploadSpeed: 0,
    peers: 0,
    seeds: 0,
    ratio: row.uploaded_size && row.downloaded_size ? row.uploaded_size / row.downloaded_size : 0,
    files: [],
    createdAt: row.created_at,
    completedAt: row.completed_at,
    error: row.error,
  };
}
