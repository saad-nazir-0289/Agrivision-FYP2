import { useEffect, useState } from 'react';
import { api } from './api';

// Loads the logged-in farmer's own AOIs and keeps track of the one that is selected.
export function useAois() {
  const [aois, setAois] = useState(null); // null while loading
  const [aoiId, setAoiId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api('/aois')
      .then((d) => {
        setAois(d.aois);
        if (d.aois[0]) setAoiId(d.aois[0]._id);
      })
      .catch((err) => {
        setAois([]);
        setError(err.message);
      });
  }, []);

  return { aois, aoiId, setAoiId, error };
}