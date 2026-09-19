'use client'

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { clearPendingPhoto, savePendingPhoto } from '../lib/pending-photo';
import './upload.css';

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
]);

function formatMegabytes(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function validateFile(file) {
  if (!ALLOWED_TYPES.has(file.type)) {
    return 'Choose a JPG, PNG, WEBP or HEIC photo.';
  }
  if (file.size > MAX_FILE_SIZE) {
    return 'The photo is larger than 20 MB.';
  }
  return null;
}

export default function UploadPage() {
  const router = useRouter();
  const fileInput = useRef(null);
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [walletBalance, setWalletBalance] = useState(null);

  useEffect(() => {
    const token = sessionStorage.getItem('project-drive-token');
    if (!token) return;
    fetch('/api/wallet', { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => response.ok ? response.json() : null)
      .then((wallet) => { if (wallet) setWalletBalance(wallet.balance); })
      .catch(() => { /* Upload продолжает работать и без показателя баланса. */ });
  }, []);

  // URL.createObjectURL показывает локальный файл без отправки на сервер.
  // Старый URL освобождаем, чтобы браузер не держал лишнюю память.
  useEffect(() => {
    if (!file) {
      setPreviewUrl('');
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function chooseFile(nextFile) {
    if (!nextFile) return;
    const validationError = validateFile(nextFile);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError('');
    setFile(nextFile);
  }

  function openPicker() {
    fileInput.current?.click();
  }

  async function replacePhoto() {
    setFile(null);
    setError('');
    await clearPendingPhoto();
    fileInput.current?.click();
  }

  async function startCustomizing() {
    if (!file || isSaving) return;
    setIsSaving(true);
    setError('');
    try {
      await savePendingPhoto(file);
      // Эта кнопка начинает НОВУЮ машину. Удаляем только указатели текущей
      // вкладки; старый проект и его версии остаются сохранёнными в Garage.
      sessionStorage.removeItem('project-drive-project-id');
      sessionStorage.removeItem('project-drive-uploaded-project-id');
      sessionStorage.removeItem('project-drive-last-result');
      localStorage.removeItem('project-drive-draft');
      router.push('/configurator');
    } catch {
      setError('The browser could not save this photo. Please choose it again.');
      setIsSaving(false);
    }
  }

  return (
    <main className="uploadPage">
      <div className="blueprint" aria-hidden="true" />
      <div className="uploadWrap">
        <nav className="uploadNav">
          <a className="brand" href="/" aria-label="Project Drive home">
            <CarMark />
            Project Drive
          </a>
          <div className="uploadAccountLinks">
            <a href="/garage">Garage</a>
            <a className="credits" href="/credits" title="Local demo balance">
              <span className="creditRing" />{walletBalance == null ? 'Guest' : walletBalance}
            </a>
          </div>
        </nav>

        <section className="uploadShell">
          <h1>Upload your car</h1>
          <p className="lede">One photo is all we need to start.</p>

          <input
            ref={fileInput}
            className="fileInput"
            type="file"
            accept=".jpg,.jpeg,.png,.webp,.heic,image/jpeg,image/png,image/webp,image/heic"
            onChange={(event) => chooseFile(event.target.files?.[0])}
          />

          {!file ? (
            <>
              <button
                className={`drop ${isDragging ? 'over' : ''}`}
                type="button"
                onClick={openPicker}
                onDragEnter={(event) => { event.preventDefault(); setIsDragging(true); }}
                onDragOver={(event) => event.preventDefault()}
                onDragLeave={(event) => { event.preventDefault(); setIsDragging(false); }}
                onDrop={(event) => {
                  event.preventDefault();
                  setIsDragging(false);
                  chooseFile(event.dataTransfer.files?.[0]);
                }}
              >
                <UploadIcon />
                <strong>Drag a photo here</strong>
                <span>or click to choose a file</span>
                <small>JPG · PNG · WEBP · HEIC — up to 20 MB</small>
              </button>

              <div className="buttonRow">
                <button className="secondaryButton" type="button" onClick={openPicker}>
                  <GalleryIcon /> Choose from gallery
                </button>
                <button className="secondaryButton" type="button" onClick={openPicker}>
                  <CameraIcon /> Take a photo
                </button>
              </div>

              <div className="tips">
                {[
                  'Use a clear, well-lit photo',
                  'Show the whole car, front to back',
                  'A front three-quarter angle works best',
                  'Avoid deep shadow or darkness',
                ].map((tip) => (
                  <div className="tip" key={tip}><CheckIcon />{tip}</div>
                ))}
              </div>
            </>
          ) : (
            <div className="previewCard">
              <div className="previewImage">
                {/* Обычный img здесь уместен: URL существует только локально в браузере. */}
                {/* До создания URL не рендерим img с пустым src: браузер иначе */}
                {/* попробует повторно загрузить саму страницу как изображение. */}
                {previewUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previewUrl} alt="Your selected car" />
                )}
              </div>
              <div className="previewBar">
                <div className="fileName">
                  <CheckIcon />
                  <span>{file.name}</span>
                  <small>· {formatMegabytes(file.size)}</small>
                </div>
                <div className="previewActions">
                  <button className="replaceButton" type="button" onClick={replacePhoto}>Replace</button>
                  <button className="primaryButton" type="button" onClick={startCustomizing} disabled={isSaving}>
                    {isSaving ? 'Saving…' : 'Start customizing'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {error && <p className="errorMessage" role="alert">{error}</p>}
          <p className="privacyNote">Your photo stays on this computer until you create an account and start generation.</p>
        </section>
      </div>
    </main>
  );
}

function CarMark() {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 15l2.4-6C6 7.6 7.2 7 8.6 7h6.8c1.4 0 2.6.6 3.2 2l2.4 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><circle cx="7" cy="15.5" r="2.2" stroke="var(--accent)" strokeWidth="1.5"/><circle cx="17" cy="15.5" r="2.2" stroke="var(--accent)" strokeWidth="1.5"/></svg>;
}
function UploadIcon() {
  return <svg className="dropIcon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 16V5M12 5L7.5 9.5M12 5l4.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>;
}
function GalleryIcon() {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.6"/><circle cx="8.5" cy="10" r="1.5" stroke="currentColor" strokeWidth="1.4"/><path d="M5 17l4-4 3 3 3-4 4 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
function CameraIcon() {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 8a2 2 0 012-2h1.5l1-2h5l1 2H20a2 2 0 012 2v9a2 2 0 01-2 2H6a2 2 0 01-2-2V8z" stroke="currentColor" strokeWidth="1.5"/><circle cx="12" cy="12.5" r="3.2" stroke="currentColor" strokeWidth="1.5"/></svg>;
}
function CheckIcon() {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
