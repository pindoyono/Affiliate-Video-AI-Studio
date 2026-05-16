export class TrackEventDto {
  videoId: string;
  views?: number;
  clicks?: number;
  watchTime?: number;
  retention?: number;
  /** Revenue generated (in currency units) for this event batch. */
  revenue?: number;
  /** Total cost spent to produce / promote the video, used for ROI calc. */
  cost?: number;
}
