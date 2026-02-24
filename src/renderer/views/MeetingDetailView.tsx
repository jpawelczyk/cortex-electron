import { useState, useEffect, useRef, useMemo } from 'react';
import { ArrowLeft, Trash2, Check, X, MapPin, Link, Calendar } from 'lucide-react';
import { useStore } from '../stores';
import { MarkdownEditor, type MarkdownEditorHandle } from '../components/MarkdownEditor';
import { useDebouncedCallback } from '../hooks/useDebouncedCallback';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { StakeholderPicker } from '../components/StakeholderPicker';
import { RecordingControls } from '../components/RecordingControls';
import { AudioPlayer, type AudioPlayerHandle } from '../components/AudioPlayer';
import { TranscriptView } from '../components/TranscriptView';
import { DatePickerButton } from '../components/DatePickerButton';
import { TimePickerButton } from '../components/TimePickerButton';
import type { TranscriptSegment } from '@shared/recording-types';

type MeetingStatus = 'scheduled' | 'completed' | 'cancelled';

const STATUS_OPTIONS: { value: MeetingStatus; label: string; className: string }[] = [
  { value: 'scheduled', label: 'Scheduled', className: 'bg-blue-500/20 text-blue-400' },
  { value: 'completed', label: 'Completed', className: 'bg-emerald-500/20 text-emerald-400' },
  { value: 'cancelled', label: 'Cancelled', className: 'bg-muted-foreground/20 text-muted-foreground' },
];

interface MeetingDetailViewProps {
  meetingId: string;
}

export function MeetingDetailView({ meetingId }: MeetingDetailViewProps) {
  const meetings = useStore((s) => s.meetings);
  const updateMeeting = useStore((s) => s.updateMeeting);
  const fetchMeetings = useStore((s) => s.fetchMeetings);
  const deleteMeeting = useStore((s) => s.deleteMeeting);
  const deselectMeeting = useStore((s) => s.deselectMeeting);
  const contexts = useStore((s) => s.contexts);
  const projects = useStore((s) => s.projects);
  const autoFocusMeetingTitle = useStore((s) => s.autoFocusMeetingTitle);
  const setAutoFocusMeetingTitle = useStore((s) => s.setAutoFocusMeetingTitle);
  const meetingAttendeeLinks = useStore((s) => s.meetingAttendeeLinks);
  const fetchMeetingAttendees = useStore((s) => s.fetchMeetingAttendees);
  const linkAttendee = useStore((s) => s.linkAttendee);
  const unlinkAttendee = useStore((s) => s.unlinkAttendee);

  const meeting = meetings.find((m) => m.id === meetingId);

  const [title, setTitle] = useState(meeting?.title ?? '');
  const [notes, setNotes] = useState(meeting?.notes ?? '');
  const [location, setLocation] = useState(meeting?.location ?? '');
  const [meetingUrl, setMeetingUrl] = useState(meeting?.meeting_url ?? '');
  const titleRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<MarkdownEditorHandle>(null);
  const audioPlayerRef = useRef<AudioPlayerHandle>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);
  const [projectOpen, setProjectOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);

  // Sync local state when meeting changes
  useEffect(() => {
    if (meeting) {
      setTitle(meeting.title);
      setNotes(meeting.notes ?? '');
      setLocation(meeting.location ?? '');
      setMeetingUrl(meeting.meeting_url ?? '');
    }
  }, [meetingId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (autoFocusMeetingTitle && titleRef.current) {
      titleRef.current.focus();
      titleRef.current.select();
      setAutoFocusMeetingTitle(false);
    }
  }, [autoFocusMeetingTitle, setAutoFocusMeetingTitle]);

  useEffect(() => {
    fetchMeetingAttendees(meetingId);
  }, [meetingId, fetchMeetingAttendees]);

  const attendeeIds = useMemo(
    () => meetingAttendeeLinks.filter(l => l.meeting_id === meetingId).map(l => l.stakeholder_id),
    [meetingAttendeeLinks, meetingId]
  );

  const { debouncedFn: debouncedSaveTitle } = useDebouncedCallback(
    (newTitle: string) => updateMeeting(meetingId, { title: newTitle }),
    500,
  );

  const { debouncedFn: debouncedSaveNotes } = useDebouncedCallback(
    (newNotes: string) => updateMeeting(meetingId, { notes: newNotes }),
    500,
  );

  const { debouncedFn: debouncedSaveLocation } = useDebouncedCallback(
    (v: string) => updateMeeting(meetingId, { location: v || null }),
    500,
  );

  const { debouncedFn: debouncedSaveMeetingUrl } = useDebouncedCallback(
    (v: string) => updateMeeting(meetingId, { meeting_url: v || null }),
    500,
  );

  if (!meeting) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Meeting not found</p>
      </div>
    );
  }

  // Parse date/time for inputs
  const startDate = meeting.start_time ? new Date(meeting.start_time) : new Date();
  const startDateStr = startDate.toISOString().slice(0, 10);
  const startTimeStr = startDate.toTimeString().slice(0, 5);
  const endDate = meeting.end_time ? new Date(meeting.end_time) : null;
  const endTimeStr = endDate ? endDate.toTimeString().slice(0, 5) : '';

  const currentStatusConfig = STATUS_OPTIONS.find((s) => s.value === meeting.status);
  const context = meeting.context_id ? contexts.find(c => c.id === meeting.context_id) ?? null : null;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-12 py-8">
        {/* Top bar: back + delete */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={deselectMeeting}
            data-testid="back-to-meetings"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-default"
          >
            <ArrowLeft className="size-4" />
            <span>Meetings</span>
          </button>

          {confirmingDelete ? (
            <div className="flex items-center gap-1.5 rounded-lg bg-accent px-2.5 py-1">
              <span className="text-sm text-muted-foreground mr-1">Confirm?</span>
              <button
                data-testid="confirm-delete"
                onClick={async () => { await deleteMeeting(meetingId); deselectMeeting(); }}
                className="p-1 rounded bg-destructive/15 text-destructive hover:bg-destructive/25 transition-colors"
                aria-label="Confirm delete"
              >
                <Check className="size-3.5" />
              </button>
              <button
                data-testid="cancel-delete"
                onClick={() => setConfirmingDelete(false)}
                className="p-1 rounded text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                aria-label="Cancel delete"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmingDelete(true)}
              data-testid="delete-meeting"
              className="p-1 rounded text-muted-foreground/40 hover:text-destructive transition-colors"
              aria-label="Delete meeting"
            >
              <Trash2 className="size-3.5" />
            </button>
          )}
        </div>

        {/* Title */}
        <input
          ref={titleRef}
          value={title}
          data-testid="meeting-title-input"
          onChange={(e) => {
            setTitle(e.target.value);
            debouncedSaveTitle(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              editorRef.current?.focus();
            }
          }}
          className="w-full text-2xl font-bold bg-transparent border-0 outline-none mb-4 text-foreground placeholder:text-muted-foreground/50"
          placeholder="Meeting title"
        />

        {/* Metadata pills */}
        <div className="flex items-center gap-3 mb-4">
          {/* Status selector */}
          <Popover open={statusOpen} onOpenChange={setStatusOpen}>
            <PopoverTrigger asChild>
              <button
                data-testid="meeting-status-picker"
                className={`text-xs px-2.5 py-1 rounded-full font-medium cursor-default transition-colors ${currentStatusConfig?.className ?? ''}`}
              >
                {currentStatusConfig?.label ?? meeting.status}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-1" align="start">
              {STATUS_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  role="option"
                  aria-label={opt.label}
                  onClick={() => { updateMeeting(meetingId, { status: opt.value }); setStatusOpen(false); }}
                  className="flex items-center gap-2 w-full px-2 py-1.5 text-sm text-foreground hover:bg-accent rounded-md cursor-pointer"
                >
                  <span className={`size-2 rounded-full ${opt.className.split(' ')[0]}`} />
                  <span>{opt.label}</span>
                </button>
              ))}
            </PopoverContent>
          </Popover>

          {/* Context selector */}
          <Popover open={contextOpen} onOpenChange={setContextOpen}>
            <PopoverTrigger asChild>
              <button
                data-testid="meeting-context-picker"
                className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium cursor-default transition-all ${
                  context
                    ? 'bg-accent/50 text-foreground hover:bg-accent'
                    : 'bg-transparent text-muted-foreground hover:bg-accent/50'
                }`}
              >
                {context ? (
                  <>
                    <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: context.color ?? undefined }} />
                    {context.name}
                  </>
                ) : (
                  'No context'
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-1" align="start">
              <button
                role="option"
                aria-label="None"
                onClick={() => { updateMeeting(meetingId, { context_id: null }); setContextOpen(false); }}
                className="flex items-center gap-2 w-full px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent rounded-md cursor-pointer"
              >
                None
              </button>
              {contexts.map(c => (
                <button
                  key={c.id}
                  role="option"
                  aria-label={c.name}
                  onClick={() => { updateMeeting(meetingId, { context_id: c.id }); setContextOpen(false); }}
                  className="flex items-center gap-2 w-full px-2 py-1.5 text-sm text-foreground hover:bg-accent rounded-md cursor-pointer"
                >
                  <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: c.color ?? 'currentColor' }} />
                  {c.name}
                </button>
              ))}
            </PopoverContent>
          </Popover>

          {/* Project selector */}
          <Popover open={projectOpen} onOpenChange={setProjectOpen}>
            <PopoverTrigger asChild>
              <button
                data-testid="meeting-project-picker"
                className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium cursor-default transition-all ${
                  meeting.project_id
                    ? 'bg-accent/50 text-foreground hover:bg-accent'
                    : 'bg-transparent text-muted-foreground hover:bg-accent/50'
                }`}
              >
                {(() => {
                  const proj = meeting.project_id ? projects.find(p => p.id === meeting.project_id) : null;
                  return proj ? proj.title : 'No project';
                })()}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-1" align="start">
              <button
                role="option"
                aria-label="None"
                onClick={() => { updateMeeting(meetingId, { project_id: null }); setProjectOpen(false); }}
                className="flex items-center gap-2 w-full px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent rounded-md cursor-pointer"
              >
                None
              </button>
              {projects.filter(p => !p.deleted_at).map(p => (
                <button
                  key={p.id}
                  role="option"
                  aria-label={p.title}
                  onClick={() => { updateMeeting(meetingId, { project_id: p.id }); setProjectOpen(false); }}
                  className="flex items-center gap-2 w-full px-2 py-1.5 text-sm text-foreground hover:bg-accent rounded-md cursor-pointer"
                >
                  {p.title}
                </button>
              ))}
            </PopoverContent>
          </Popover>

          {/* Attendees */}
          <StakeholderPicker
            selectedIds={attendeeIds}
            onLink={(stakeholderId) => linkAttendee(meetingId, stakeholderId)}
            onUnlink={(stakeholderId) => unlinkAttendee(meetingId, stakeholderId)}
          />
        </div>

        {/* Schedule row */}
        <div className="flex items-center gap-1 text-sm text-muted-foreground mb-6">
          <DatePickerButton
            value={startDateStr}
            onChange={(date) => {
              if (!date) return;
              const time = meeting.is_all_day ? '00:00:00' : startTimeStr + ':00';
              updateMeeting(meetingId, { start_time: `${date}T${time}` });
            }}
            icon={<Calendar className="size-3.5" />}
            label="Meeting date"
          />
          <button
            data-testid="meeting-all-day-toggle"
            onClick={() => updateMeeting(meetingId, { is_all_day: !meeting.is_all_day })}
            className={`text-xs px-2 py-1 rounded-md transition-colors cursor-default ${
              meeting.is_all_day
                ? 'bg-primary/15 text-primary font-medium'
                : 'text-muted-foreground hover:bg-accent/50'
            }`}
          >
            All day
          </button>
          {!meeting.is_all_day && (
            <>
              <TimePickerButton
                value={startTimeStr}
                data-testid="meeting-start-time-input"
                onChange={(time) => updateMeeting(meetingId, { start_time: `${startDateStr}T${time}:00` })}
              />
              <span className="text-muted-foreground/50">–</span>
              <TimePickerButton
                value={endTimeStr}
                data-testid="meeting-end-time-input"
                onChange={(time) => updateMeeting(meetingId, { end_time: `${startDateStr}T${time}:00` })}
                placeholder="End"
              />
            </>
          )}
        </div>

        {/* Details */}
        <div className="space-y-2 mb-6">
          <div className="flex items-center gap-3">
            <MapPin className="size-3.5 text-muted-foreground/50 shrink-0" />
            <input
              value={location}
              onChange={(e) => { setLocation(e.target.value); debouncedSaveLocation(e.target.value); }}
              className="flex-1 text-sm bg-transparent border-0 outline-none text-foreground placeholder:text-muted-foreground/30"
              placeholder="Add location"
              data-testid="meeting-location-input"
            />
          </div>
          <div className="flex items-center gap-3">
            <Link className="size-3.5 text-muted-foreground/50 shrink-0" />
            <input
              value={meetingUrl}
              onChange={(e) => { setMeetingUrl(e.target.value); debouncedSaveMeetingUrl(e.target.value); }}
              className="flex-1 text-sm bg-transparent border-0 outline-none text-foreground placeholder:text-muted-foreground/30"
              placeholder="Add meeting URL"
              data-testid="meeting-url-input"
            />
            {meetingUrl && (
              <a
                href={meetingUrl.startsWith('http') ? meetingUrl : `https://${meetingUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline shrink-0"
              >
                Open
              </a>
            )}
          </div>
        </div>

        {/* Recording */}
        <div className="mb-4">
          <RecordingControls
            meetingId={meetingId}
            audioPath={meeting.audio_path}
            onRecordingComplete={fetchMeetings}
          />
        </div>

        {/* Audio player */}
        {meeting.audio_path && (
          <div className="mb-4">
            <AudioPlayer
              ref={audioPlayerRef}
              src={`file://${meeting.audio_path}`}
            />
          </div>
        )}

        {/* Transcript */}
        {(() => {
          let segments: TranscriptSegment[] | null = null;
          if (meeting.transcript_segments) {
            try {
              segments = JSON.parse(meeting.transcript_segments) as TranscriptSegment[];
            } catch {
              segments = null;
            }
          }
          return (
            <div className="mb-6">
              <TranscriptView
                meetingId={meetingId}
                audioPath={meeting.audio_path}
                transcript={meeting.transcript}
                transcriptSegments={segments}
                transcriptionStatus={meeting.transcription_status}
                onSeekTo={(seconds) => audioPlayerRef.current?.seekTo(seconds)}
                onTranscriptionComplete={fetchMeetings}
              />
            </div>
          );
        })()}

        {/* Editor */}
        <MarkdownEditor
          ref={editorRef}
          key={meetingId}
          value={notes}
          onChange={(md) => {
            setNotes(md);
            debouncedSaveNotes(md);
          }}
        />
      </div>
    </div>
  );
}
