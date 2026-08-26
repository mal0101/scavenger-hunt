export interface QrPayload {
  index_id: string;
  game_id: string;
  round_id: string;
  timestamp: string;
  signature: string;
}

export interface QrScanRequest {
  qr_data: string;
  game_id: string;
  gps_lat?: number;
  gps_lng?: number;
}

export interface QrScanResponse {
  index_label: string;
  points_earned: number;
  total_points: number;
  rank: number;
  scanned_at: string;
}
