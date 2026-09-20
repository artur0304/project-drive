'use client'

import { useRouter } from 'next/navigation';
import './result.css';

// Старый адрес без id больше не зависит от sessionStorage. Пользователь выбирает
// конкретную сохранённую версию в Garage и получает постоянную ссылку с id.
export default function ResultIndexPage() {
  const router = useRouter();
  return <main className="resultEmpty">
    <h1>Choose a saved result</h1>
    <p>Open Garage and select a version. Its link will keep working after refresh.</p>
    <button type="button" onClick={() => router.push('/garage')}>Open garage</button>
  </main>;
}
