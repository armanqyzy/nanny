import { useEffect, useRef, useState } from 'react';
import Icon from './Icon';
import { useLanguage } from '../lib/i18n';

export default function VoiceRecorder({ value, onChange, disabled }) {
  const { language } = useLanguage();
  const t = {
    en: { denied: 'Microphone access was denied.', record: 'Record voice message', stop: 'Stop recording', remove: 'Remove voice message' },
    ru: { denied: 'Доступ к микрофону запрещён.', record: 'Записать голосовое сообщение', stop: 'Остановить запись', remove: 'Убрать голосовое сообщение' },
    kz: { denied: 'Микрофонға рұқсат берілмеді.', record: 'Дауыстық хабарлама жазу', stop: 'Жазуды тоқтату', remove: 'Дауыстық хабарламаны алып тастау' },
  }[language] || {};
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState('');
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);

  useEffect(() => () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
  }, []);

  async function startRecording() {
    try {
      setError('');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          onChange({
            audio_url: reader.result,
            mimeType: blob.type,
          });
        };
        reader.readAsDataURL(blob);

        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
      };

      recorder.start();
      setIsRecording(true);
    } catch (err) {
      setError(err.message || t.denied || 'Microphone access was denied.');
    }
  }

  function stopRecording() {
    if (!recorderRef.current) return;
    recorderRef.current.stop();
    setIsRecording(false);
  }

  return (
    <div className="flex items-center gap-2">
      {!isRecording ? (
        <button
          type="button"
          className="btn-ghost h-12 w-12 rounded-2xl px-0 py-0"
          disabled={disabled}
          onClick={startRecording}
          aria-label={t.record || 'Record voice message'}
          title={t.record || 'Record voice message'}
        >
          <Icon name="microphone" className="h-5 w-5" />
        </button>
      ) : (
        <button
          type="button"
          className="btn-secondary h-12 w-12 rounded-2xl px-0 py-0"
          onClick={stopRecording}
          aria-label={t.stop || 'Stop recording'}
          title={t.stop || 'Stop recording'}
        >
          <Icon name="check" className="h-5 w-5" />
        </button>
      )}

      {value?.audio_url && (
        <div className="flex items-center gap-2 rounded-xl border border-nanny-orange/20 bg-white px-3 py-2">
          <audio controls src={value.audio_url} className="max-w-[180px]" />
          <button type="button" className="rounded-full bg-red-50 p-2 text-red-600" onClick={() => onChange(null)} aria-label={t.remove || 'Remove voice message'}>
            <Icon name="close" className="h-4 w-4" />
          </button>
        </div>
      )}

      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
