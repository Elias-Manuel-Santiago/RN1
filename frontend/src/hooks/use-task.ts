import { useRef, useState } from 'react';

export function useTask() {
  const locked = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  async function run(task: () => Promise<void>, success = '') {
    if (locked.current) return;
    locked.current = true;
    setBusy(true); setError(''); setMessage('');
    try { await task(); setMessage(success); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'No se pudo completar la operación.'); }
    finally { locked.current = false; setBusy(false); }
  }
  return { busy, error, message, run, setError };
}
