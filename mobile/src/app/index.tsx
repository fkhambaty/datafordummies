import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';

import { hasFinishedOnboarding } from '../lib/secure-session';

export default function Entry() {
  const [onboarded, setOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    void hasFinishedOnboarding().then((value) => {
      if (active) setOnboarded(value);
    });
    return () => {
      active = false;
    };
  }, []);

  if (onboarded === null) return null;
  return <Redirect href={onboarded ? '/(tabs)' : '/onboarding'} />;
}
