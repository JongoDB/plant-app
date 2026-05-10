import { useEffect, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import type { Plant } from '@plant-app/shared';

import { plantsApi, type UpdatePlantInput } from '../../../src/api/client';
import { RequireAuth } from '../../../src/components/RequireAuth';
import { Screen } from '../../../src/components/Screen';
import { PlantForm, type PlantFormValues } from '../../../src/screens/PlantForm';
import { theme } from '../../../src/theme';

export default function EditPlantScreen() {
  return (
    <RequireAuth>
      <Stack.Screen options={{ title: 'Edit plant', presentation: 'modal' }} />
      <EditPlantForm />
    </RequireAuth>
  );
}

function EditPlantForm() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [plant, setPlant] = useState<Plant | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    void (async () => {
      try {
        const p = await plantsApi.get(id);
        setPlant(p);
      } catch {
        // Detail screen will show a more useful error; just bounce back.
        router.back();
      } finally {
        setLoading(false);
      }
    })();
  }, [id, router]);

  if (loading || !plant) {
    return (
      <Screen style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={theme.colors.primary} />
      </Screen>
    );
  }

  const initial: PlantFormValues = {
    nickname: plant.nickname,
    scientificName: plant.scientificName,
    commonName: plant.commonName,
    locationDescription: plant.homeLocation?.description,
    light: plant.homeLocation?.lightExposure,
    acquiredOn: plant.acquiredOn,
    notes: plant.notes,
  };

  const submit = async (values: PlantFormValues) => {
    // Send PATCH with only fields the user might have changed.
    // null clears, undefined leaves unchanged.
    const update: UpdatePlantInput = {
      nickname: values.nickname,
      scientificName: values.scientificName ?? null,
      commonName: values.commonName ?? null,
      acquiredOn: values.acquiredOn ?? null,
      notes: values.notes ?? null,
    };
    if (values.locationDescription) {
      update.homeLocation = {
        description: values.locationDescription,
        lightExposure: values.light ?? null,
      };
    } else {
      update.homeLocation = { lightExposure: null };
    }
    await plantsApi.update(plant.id, update);
    router.back();
  };

  return (
    <PlantForm
      initial={initial}
      submitLabel="Save changes"
      onSubmit={submit}
      onCancel={() => router.back()}
    />
  );
}
