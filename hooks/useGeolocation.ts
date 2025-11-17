
import { useState, useCallback } from 'react';
import { GEOLOCATION_OPTIONS } from '../constants';

interface GeolocationState {
  loading: boolean;
  error: GeolocationPositionError | Error | null;
  position: GeolocationPosition | null;
}

export const useGeolocation = () => {
  const [state, setState] = useState<GeolocationState>({
    loading: false,
    error: null,
    position: null,
  });

  const getLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setState(prevState => ({ ...prevState, error: new Error('Geolocation is not supported by your browser') }));
      return;
    }

    setState({ loading: true, error: null, position: null });

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({ loading: false, error: null, position });
      },
      (error) => {
        setState({ loading: false, error, position: null });
      },
      GEOLOCATION_OPTIONS
    );
  }, []);

  return { ...state, getLocation };
};
