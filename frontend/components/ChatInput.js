import { useRef, useState } from 'react';
import VoiceRecorder from './VoiceRecorder';
import Icon from './Icon';
import { useLanguage } from '../lib/i18n';

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function ChatInput({ disabled, onSend, onTyping }) {
  const { language } = useLanguage();
  const t = {
    en: {
      couldNotRead: 'Could not read file.',
      couldNotSend: 'Could not send message.',
      imagePreview: 'Image preview',
      attachedFile: 'Attached file',
      remove: 'Remove',
      chooseConversation: 'Choose a conversation first',
      writeMessage: 'Write a message...',
      attachFile: 'Attach file',
      sendMessage: 'Send message',
    },
    ru: {
      couldNotRead: 'Не удалось прочитать файл.',
      couldNotSend: 'Не удалось отправить сообщение.',
      imagePreview: 'Превью изображения',
      attachedFile: 'Прикреплённый файл',
      remove: 'Убрать',
      chooseConversation: 'Сначала выберите диалог',
      writeMessage: 'Введите сообщение...',
      attachFile: 'Прикрепить файл',
      sendMessage: 'Отправить сообщение',
    },
    kz: {
      couldNotRead: 'Файлды оқу мүмкін болмады.',
      couldNotSend: 'Хабарламаны жіберу мүмкін болмады.',
      imagePreview: 'Сурет превьюі',
      attachedFile: 'Тіркелген файл',
      remove: 'Алу',
      chooseConversation: 'Алдымен диалогты таңдаңыз',
      writeMessage: 'Хабарлама жазыңыз...',
      attachFile: 'Файл тіркеу',
      sendMessage: 'Хабарлама жіберу',
    },
  }[language] || {};
  const fileRef = useRef(null);
  const [text, setText] = useState('');
  const [audio, setAudio] = useState(null);
  const [image, setImage] = useState(null);
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  async function handleFileChange(event) {
    const selected = event.target.files?.[0];
    if (!selected) return;

    try {
      const dataUrl = await readFileAsDataUrl(selected);
      if (selected.type.startsWith('image/')) {
        setImage({ image_url: dataUrl, name: selected.name });
        setFile(null);
      } else {
        setFile({ file_url: dataUrl, name: selected.name, type: selected.type });
      }
      setError('');
    } catch (err) {
      setError(err.message || t.couldNotRead || 'Could not read file.');
    } finally {
      event.target.value = '';
    }
  }

  async function submit(event) {
    event?.preventDefault();
    if (disabled || sending) return;

    const payload = {
      body: text.trim(),
      audio_url: audio?.audio_url || null,
      image_url: image?.image_url || null,
      file_url: file?.file_url || null,
    };

    const hasContent = Object.values(payload).some(Boolean);
    if (!hasContent) return;

    try {
      setSending(true);
      setError('');
      await onSend(payload);
      setText('');
      setAudio(null);
      setImage(null);
      setFile(null);
    } catch (err) {
      setError(err.message || t.couldNotSend || 'Could not send message.');
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  }

  return (
    <form onSubmit={submit} className="border-t border-nanny-orange/20 bg-white/88 p-4 backdrop-blur">
      {(image || file || audio) && (
        <div className="mb-3 space-y-2">
          {image && (
            <div className="rounded-2xl border border-nanny-orange/20 bg-white p-3">
              <div className="mb-2 text-xs font-semibold opacity-70">{image.name || t.imagePreview || 'Image preview'}</div>
              <img src={image.image_url} alt="Preview" className="max-h-40 rounded-2xl object-cover" />
            </div>
          )}
          {file && (
            <div className="flex items-center justify-between rounded-2xl border border-nanny-orange/20 bg-white px-3 py-2 text-sm">
              <span className="truncate">{file.name || t.attachedFile || 'Attached file'}</span>
              <button type="button" className="font-semibold text-red-600" onClick={() => setFile(null)}>{t.remove || 'Remove'}</button>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <div className="flex-1">
          <textarea
            className="input min-h-[84px] resize-none rounded-[24px] border-nanny-orange/25 bg-white px-5 py-4"
            placeholder={disabled ? (t.chooseConversation || 'Choose a conversation first') : (t.writeMessage || 'Write a message...')}
            value={text}
            disabled={disabled}
            onKeyDown={handleKeyDown}
            onChange={(e) => {
              setText(e.target.value);
              onTyping?.();
            }}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="btn-ghost h-12 w-12 rounded-2xl px-0 py-0"
            disabled={disabled}
            onClick={() => fileRef.current?.click()}
            aria-label={t.attachFile || 'Attach file'}
            title={t.attachFile || 'Attach file'}
          >
            <Icon name="attach" className="h-5 w-5" />
          </button>
          <input ref={fileRef} type="file" className="hidden" onChange={handleFileChange} />
          <VoiceRecorder value={audio} onChange={setAudio} disabled={disabled} />
          <button
            type="submit"
            className="btn-primary h-12 w-12 rounded-2xl px-0 py-0"
            disabled={disabled || sending}
            aria-label={t.sendMessage || 'Send message'}
            title={t.sendMessage || 'Send message'}
          >
            <Icon name="send" className="h-5 w-5" />
          </button>
        </div>
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </form>
  );
}
