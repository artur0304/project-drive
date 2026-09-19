// Служебный просмотр всех утверждённых экранов оставляем по адресу /preview.
// Он нужен для сравнения во время переноса и не является пользовательским экраном.
export default function PreviewPage() {
  return (
    <iframe
      src="/prototype/00-all-screens-preview.html"
      title="Project Drive prototype preview"
      style={{ width: '100vw', height: '100vh', border: 0, display: 'block' }}
    />
  );
}
