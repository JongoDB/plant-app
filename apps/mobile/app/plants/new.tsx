import { Stack, useLocalSearchParams, useRouter } from 'expo-router';

import { plantsApi, type CreatePlantInput } from '../../src/api/client';
import { RequireAuth } from '../../src/components/RequireAuth';
import { PlantForm, type PlantFormValues } from '../../src/screens/PlantForm';

export default function NewPlantScreen() {
  return (
    <RequireAuth>
      <Stack.Screen options={{ title: 'New plant', presentation: 'modal' }} />
      <NewPlantForm />
    </RequireAuth>
  );
}

function NewPlantForm() {
  const router = useRouter();
  // Identify flow can pre-fill species fields via query params.
  const params = useLocalSearchParams<{
    scientificName?: string;
    commonName?: string;
  }>();

  const initial: PlantFormValues = {
    nickname: params.commonName ?? '',
    scientificName: params.scientificName,
    commonName: params.commonName,
  };

  const submit = async (values: PlantFormValues) => {
    const input: CreatePlantInput = { nickname: values.nickname };
    if (values.scientificName) input.scientificName = values.scientificName;
    if (values.commonName) input.commonName = values.commonName;
    if (values.locationDescription) {
      input.homeLocation = { description: values.locationDescription };
      if (values.light) input.homeLocation.lightExposure = values.light;
    }
    if (values.acquiredOn) input.acquiredOn = values.acquiredOn;
    if (values.notes) input.notes = values.notes;
    await plantsApi.create(input);
    router.back();
  };

  return (
    <PlantForm
      initial={initial}
      submitLabel="Save plant"
      onSubmit={submit}
      onCancel={() => router.back()}
    />
  );
}
