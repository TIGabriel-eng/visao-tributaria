export type ConsentChoice = 'accepted' | 'rejected' | null;

const STORAGE_KEY = 'orcoma_cookie_consent';

function read(): ConsentChoice {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'accepted' || v === 'rejected') return v;
  } catch {}
  return null;
}

export const ConsentService = {
  get(): ConsentChoice {
    return read();
  },

  hasChoice(): boolean {
    return read() !== null;
  },

  hasAccepted(): boolean {
    return read() === 'accepted';
  },

  set(choice: 'accepted' | 'rejected') {
    try {
      localStorage.setItem(STORAGE_KEY, choice);
    } catch {}
  },
};
