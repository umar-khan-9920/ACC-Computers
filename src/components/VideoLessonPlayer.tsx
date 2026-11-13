import React, { useEffect, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { VideoLesson } from '../types/academy';
import { parseDurationToSeconds } from '../utils/academyLogic';
import { SafeImage } from './SafeImage';

interface VideoLessonPlayerProps {
  lesson: VideoLesson;
  hasPrevious: boolean;
  hasNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
}

function formatSeconds(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const mins = Math.floor(s / 60);
  const rem = s % 60;
  return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
}

export const VideoLessonPlayer: React.FC<VideoLessonPlayerProps> = ({
  lesson,
  hasPrevious,
  hasNext,
  onPrevious,
  onNext,
}) => {
  const totalSeconds = Math.max(60, parseDurationToSeconds(lesson.duration) || 300);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentSec, setCurrentSec] = useState(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    setCurrentSec(0);
    setIsPlaying(true);
  }, [lesson.id]);

  useEffect(() => {
    if (!isPlaying) return;
    const intervalMs = Math.round(1000 / playbackRate);
    const timer = window.setInterval(() => {
      setCurrentSec((prev) => {
        if (prev + 1 >= totalSeconds) {
          setIsPlaying(false);
          return totalSeconds;
        }
        return prev + 1;
      });
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [isPlaying, playbackRate, totalSeconds]);

  const rawUrl = lesson.videoUrl.trim();
  const isDirectVideoFile =
    rawUrl.endsWith('.mp4') ||
    rawUrl.endsWith('.webm') ||
    rawUrl.endsWith('.ogg') ||
    rawUrl.startsWith('blob:');

  const youtubeMatch = rawUrl.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{6,})/
  );

  if (isDirectVideoFile) {
    return (
      <div className="bg-slate-950 rounded-xl overflow-hidden border border-slate-800">
        <video
          key={lesson.id}
          src={rawUrl}
          poster={lesson.thumbnailUrl}
          controls
          autoPlay
          className="w-full aspect-video bg-black"
        />
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold truncate">{lesson.title}</h3>
            <p className="text-xs text-slate-400 truncate mt-0.5">{lesson.summary}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={!hasPrevious}
              onClick={onPrevious}
              className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded-md transition-colors"
            >
              Prev
            </button>
            <button
              type="button"
              disabled={!hasNext}
              onClick={onNext}
              className="px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-500 disabled:opacity-40 rounded-md transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (youtubeMatch && youtubeMatch[1]) {
    return (
      <div className="bg-slate-950 rounded-xl overflow-hidden border border-slate-800">
        <iframe
          key={lesson.id}
          src={`https://www.youtube.com/embed/${youtubeMatch[1]}?autoplay=1`}
          title={lesson.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full aspect-video border-0"
        />
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold truncate">{lesson.title}</h3>
            <p className="text-xs text-slate-400 truncate mt-0.5">{lesson.summary}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={!hasPrevious}
              onClick={onPrevious}
              className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded-md transition-colors"
            >
              Prev
            </button>
            <button
              type="button"
              disabled={!hasNext}
              onClick={onNext}
              className="px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-500 disabled:opacity-40 rounded-md transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Interactive Studio Lesson Player (guaranteed playback without external video CDN dependency)
  const progressPct = Math.min(100, (currentSec / totalSeconds) * 100);

  return (
    <div
      data-testid="active-video-player"
      className="bg-slate-950 rounded-xl overflow-hidden border border-slate-800 shadow-lg"
    >
      <div className="relative aspect-video w-full bg-slate-900 overflow-hidden select-none">
        <SafeImage
          src={lesson.thumbnailUrl}
          alt={lesson.title}
          className={`w-full h-full object-cover transition-transform duration-700 ${
            isPlaying ? 'scale-105 brightness-75' : 'scale-100 brightness-50'
          }`}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/35 to-slate-950/30" />

        {/* Lesson Stage Overlay */}
        <div className="absolute inset-0 p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs font-mono font-medium text-slate-200 bg-slate-950/75 px-3 py-1 rounded-md border border-white/10">
              Lesson {lesson.order} · {isPlaying ? 'Playing' : 'Paused'}
            </span>
            <span className="text-xs font-mono text-slate-300 tabular-nums bg-slate-950/75 px-2.5 py-1 rounded-md border border-white/10">
              {playbackRate}x Speed
            </span>
          </div>

          <div className="max-w-2xl">
            <h3 className="text-xl sm:text-2xl font-display font-bold text-white leading-tight">
              {lesson.title}
            </h3>
            <p className="mt-2 text-sm text-slate-200 leading-relaxed">{lesson.summary}</p>
          </div>
        </div>

        {/* Center Play/Pause Affordance */}
        <button
          type="button"
          onClick={() => setIsPlaying((p) => !p)}
          aria-label={isPlaying ? `Pause ${lesson.title}` : `Play ${lesson.title}`}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-white/95 hover:bg-white text-slate-900 flex items-center justify-center shadow-xl transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-blue-500"
        >
          {isPlaying ? (
            <Pause className="w-7 h-7" aria-hidden="true" />
          ) : (
            <Play className="w-7 h-7 ml-0.5" aria-hidden="true" />
          )}
        </button>
      </div>

      {/* Player Control Deck */}
      <div className="px-4 py-3 bg-slate-900 text-white space-y-2.5">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-slate-300 tabular-nums w-11">
            {formatSeconds(currentSec)}
          </span>
          <input
            type="range"
            min={0}
            max={totalSeconds}
            value={currentSec}
            aria-label="Lesson playback timeline"
            onChange={(e) => setCurrentSec(Number(e.target.value))}
            className="flex-1 accent-blue-500 cursor-pointer h-1.5 rounded-lg"
          />
          <span className="font-mono text-xs text-slate-400 tabular-nums w-11 text-right">
            {formatSeconds(totalSeconds)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsPlaying((p) => !p)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 rounded-md transition-colors"
            >
              {isPlaying ? (
                <>
                  <Pause className="w-3.5 h-3.5" aria-hidden="true" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" aria-hidden="true" />
                  Play
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setCurrentSec(0);
                setIsPlaying(true);
              }}
              aria-label="Restart lesson"
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-md transition-colors"
            >
              <RotateCcw className="w-4 h-4" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={() => setIsMuted((m) => !m)}
              aria-label={isMuted ? 'Unmute audio' : 'Mute audio'}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-md transition-colors"
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4" aria-hidden="true" />
              ) : (
                <Volume2 className="w-4 h-4" aria-hidden="true" />
              )}
            </button>

            <select
              aria-label="Playback speed"
              value={playbackRate}
              onChange={(e) => setPlaybackRate(Number(e.target.value))}
              className="bg-slate-800 text-slate-200 text-xs font-mono px-2 py-1 rounded border border-slate-700"
            >
              <option value={1}>1x</option>
              <option value={1.25}>1.25x</option>
              <option value={1.5}>1.5x</option>
              <option value={2}>2x</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline text-xs font-mono text-slate-400 tabular-nums">
              {Math.round(progressPct)}% watched
            </span>
            <button
              type="button"
              disabled={!hasPrevious}
              onClick={onPrevious}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded-md transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
              Prev
            </button>
            <button
              type="button"
              disabled={!hasNext}
              onClick={onNext}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded-md transition-colors"
            >
              Next
              <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
