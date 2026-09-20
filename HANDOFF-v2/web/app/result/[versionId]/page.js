'use client'

import { useParams } from 'next/navigation';
import ResultView from '../result-view';

export default function SavedResultPage() {
  const { versionId } = useParams();
  return <ResultView versionId={versionId} />;
}
