import { useCallback, useRef, useState } from 'react';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { router, useFocusEffect } from 'expo-router';
import {
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { AppHeader } from '@/components/app-header';
import { BackButton } from '@/components/back-button';
import { PrimaryButton, SecondaryButton } from '@/components/buttons';
import { ScreenContainer } from '@/components/screen-container';
import { Colors, Radii, Spacing, Typography } from '@/constants/theme';
import { useNutritionLabelScan } from '@/context/nutrition-label-scan';
import {
  NutritionLabelAuthenticationError,
  NutritionLabelExtractionError,
  nutritionLabelExtractionService,
} from '@/services/nutrition-label-extraction';

type ScannerStep = 'choose' | 'camera' | 'preview';

export default function ScanNutritionLabelScreen() {
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const {
    image,
    beginManualReview,
    clearImage,
    reset,
    selectImage,
    setExtractionResult,
  } = useNutritionLabelScan();
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView | null>(null);
  const extractionInFlight = useRef(false);
  const captureInFlight = useRef(false);
  const preserveStateOnBlur = useRef(false);
  const [step, setStep] = useState<ScannerStep>(image ? 'preview' : 'choose');
  const [cameraReady, setCameraReady] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [flowError, setFlowError] = useState<string | null>(null);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const wide = windowWidth >= 640;
  const cameraHeight = Math.min(520, Math.max(340, windowHeight - 300));

  useFocusEffect(
    useCallback(() => {
      return () => {
        if (!preserveStateOnBlur.current) reset();
        preserveStateOnBlur.current = false;
      };
    }, [reset]),
  );

  function enterManualFood() {
    reset();
    router.replace('/manual-food-entry');
  }

  function cancelScanner() {
    reset();
    router.replace('/add-food');
  }

  function handleBack() {
    setFlowError(null);
    setExtractionError(null);

    if (step === 'camera') {
      setTorchEnabled(false);
      setCameraReady(false);
      setStep('choose');
      return;
    }

    if (step === 'preview') {
      clearImage();
      setStep('choose');
      return;
    }

    cancelScanner();
  }

  async function openCamera() {
    setFlowError(null);
    setExtractionError(null);

    try {
      let permission = cameraPermission;
      if (!permission?.granted) permission = await requestCameraPermission();

      if (!permission.granted) {
        setFlowError(
          permission.canAskAgain
            ? 'Camera access was not granted. Try again, choose a gallery image, or enter the food manually.'
            : 'Camera access is disabled. Enable it in device settings, choose a gallery image, or enter the food manually.',
        );
        return;
      }

      setCameraReady(false);
      setTorchEnabled(false);
      setStep('camera');
    } catch {
      setFlowError(
        'The camera could not be opened. Choose a gallery image or enter the food manually.',
      );
    }
  }

  async function chooseFromGallery() {
    setFlowError(null);
    setExtractionError(null);

    try {
      if (Platform.OS !== 'web') {
        let permission = await ImagePicker.getMediaLibraryPermissionsAsync();
        if (!permission.granted && permission.canAskAgain) {
          permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        }

        if (!permission.granted) {
          setFlowError(
            'Photo access was not granted. Allow photo access in device settings or enter the food manually.',
          );
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        allowsMultipleSelection: false,
        base64: false,
        quality: 1,
      });

      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset?.uri) {
        setFlowError('That image could not be opened. Choose another image or enter manually.');
        return;
      }

      selectImage({
        uri: asset.uri,
        source: 'gallery',
        width: asset.width,
        height: asset.height,
        mimeType: asset.mimeType,
        fileName: asset.fileName,
      });
      setStep('preview');
    } catch {
      setFlowError(
        'The image picker could not be opened. Try again or enter the food manually.',
      );
    }
  }

  async function capturePhoto() {
    if (!cameraReady || captureInFlight.current || !cameraRef.current) return;

    captureInFlight.current = true;
    setCapturing(true);
    setFlowError(null);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        base64: false,
        exif: false,
        quality: 0.9,
        skipProcessing: false,
      });

      if (!photo?.uri) throw new Error('Camera returned no image.');
      selectImage({
        uri: photo.uri,
        source: 'camera',
        width: photo.width,
        height: photo.height,
        mimeType: photo.format === 'png' ? 'image/png' : 'image/jpeg',
      });
      setTorchEnabled(false);
      setStep('preview');
    } catch {
      setFlowError(
        'The photo could not be captured. Retake it, choose a gallery image, or enter manually.',
      );
    } finally {
      captureInFlight.current = false;
      setCapturing(false);
    }
  }

  function retryCurrentSource() {
    const previousSource = image?.source;
    setExtractionError(null);
    if (previousSource === 'camera') {
      clearImage();
      setCameraReady(false);
      setStep('camera');
    } else {
      void chooseFromGallery();
    }
  }

  async function handleUsePhoto() {
    if (!image || extractionInFlight.current) return;

    extractionInFlight.current = true;
    setExtracting(true);
    setExtractionError(null);
    try {
      const extracted = await nutritionLabelExtractionService.extract(image);
      setExtractionResult(extracted);
      preserveStateOnBlur.current = true;
      router.push('/review-nutrition-label');
    } catch (error) {
      setExtractionError(
        error instanceof NutritionLabelAuthenticationError
          ? error.message
          : error instanceof NutritionLabelExtractionError
            ? error.message
          : 'Nutrition Facts could not be extracted from this image. Try another image or enter the values manually.',
      );
    } finally {
      extractionInFlight.current = false;
      setExtracting(false);
    }
  }

  function reviewLabelManually() {
    beginManualReview();
    preserveStateOnBlur.current = true;
    router.push('/review-nutrition-label');
  }

  return (
    <ScreenContainer width="page" contentStyle={styles.content}>
      <BackButton accessibilityLabel="Back" onPress={handleBack} />

      {step === 'choose' ? (
        <>
          <AppHeader
            title="Nutrition Label Scanner"
            subtitle="Take a clear photo or choose an existing image of the product's Nutrition Facts label."
          />

          <View style={[styles.choiceGrid, wide && styles.choiceGridWide]}>
            <Pressable
              accessibilityHint="Opens the in-app camera"
              accessibilityLabel="Take Photo"
              accessibilityRole="button"
              onPress={() => void openCamera()}
              style={({ pressed }) => [
                styles.choiceCard,
                wide && styles.choiceCardWide,
                pressed && styles.cardPressed,
              ]}>
              <View style={styles.choiceIcon}>
                <Text style={styles.choiceGlyph}>{'\u25A3'}</Text>
              </View>
              <Text style={styles.choiceTitle}>Take Photo</Text>
              <Text style={styles.choiceDescription}>
                Photograph the Nutrition Facts panel inside Nutrivo.
              </Text>
            </Pressable>

            <Pressable
              accessibilityHint="Opens the system image picker"
              accessibilityLabel={Platform.OS === 'web' ? 'Choose Image' : 'Choose from Gallery'}
              accessibilityRole="button"
              onPress={() => void chooseFromGallery()}
              style={({ pressed }) => [
                styles.choiceCard,
                wide && styles.choiceCardWide,
                pressed && styles.cardPressed,
              ]}>
              <View style={styles.choiceIcon}>
                <Text style={styles.choiceGlyph}>{'\u25A7'}</Text>
              </View>
              <Text style={styles.choiceTitle}>
                {Platform.OS === 'web' ? 'Choose Image' : 'Choose from Gallery'}
              </Text>
              <Text style={styles.choiceDescription}>
                Select a Nutrition Facts photo already on this device.
              </Text>
            </Pressable>
          </View>
        </>
      ) : null}

      {step === 'camera' ? (
        <>
          <AppHeader
            title="Take Photo"
            subtitle="Position the Nutrition Facts label inside the frame."
          />
          <View style={[styles.cameraShell, { height: cameraHeight }]}>
            <CameraView
              active
              enableTorch={torchEnabled}
              facing="back"
              mode="picture"
              onCameraReady={() => setCameraReady(true)}
              onMountError={() => {
                setCameraReady(false);
                setFlowError(
                  'The camera is unavailable. Choose a gallery image or enter the food manually.',
                );
              }}
              ref={cameraRef}
              style={StyleSheet.absoluteFill}
            />
            <View pointerEvents="none" style={styles.guideFrame}>
              <Text style={styles.guideText}>Nutrition Facts</Text>
            </View>
            <Pressable
              accessibilityLabel={torchEnabled ? 'Turn flash off' : 'Turn flash on'}
              accessibilityRole="button"
              accessibilityState={{ checked: torchEnabled }}
              onPress={() => setTorchEnabled((enabled) => !enabled)}
              style={({ pressed }) => [styles.torchButton, pressed && styles.controlPressed]}>
              <Text style={styles.torchText}>{torchEnabled ? 'Flash on' : 'Flash off'}</Text>
            </Pressable>
          </View>
          <PrimaryButton
            disabled={!cameraReady}
            label={capturing ? 'Capturing...' : 'Capture Label'}
            loading={capturing}
            onPress={() => void capturePhoto()}
          />
          <SecondaryButton label="Choose from Gallery" onPress={() => void chooseFromGallery()} />
        </>
      ) : null}

      {step === 'preview' && image ? (
        <>
          <AppHeader
            title="Image Preview"
            subtitle="Check that the printed Nutrition Facts values are clear and readable."
            right={
              <View style={styles.sourceBadge}>
                <Text style={styles.sourceBadgeText}>
                  {image.source === 'camera' ? 'Camera' : 'Gallery'}
                </Text>
              </View>
            }
          />
          <View style={[styles.previewShell, { height: Math.min(480, cameraHeight) }]}>
            <Image
              accessibilityLabel="Selected Nutrition Facts label"
              resizeMode="contain"
              source={{ uri: image.uri }}
              style={styles.previewImage}
            />
          </View>
          <View style={[styles.previewActions, wide && styles.previewActionsWide]}>
            <SecondaryButton
              disabled={extracting}
              label={image.source === 'camera' ? 'Retake' : 'Choose Another'}
              onPress={retryCurrentSource}
              style={styles.flexAction}
            />
            <PrimaryButton
              label={extracting ? 'Reading Label...' : extractionError ? 'Try Again' : 'Use Photo'}
              loading={extracting}
              onPress={() => void handleUsePhoto()}
              style={styles.flexAction}
            />
          </View>
        </>
      ) : null}

      {flowError ? (
        <View accessibilityLiveRegion="polite" style={styles.errorCard}>
          <Text style={styles.errorText}>{flowError}</Text>
        </View>
      ) : null}

      {extractionError ? (
        <View accessibilityLiveRegion="polite" style={styles.boundaryCard}>
          <Text style={styles.boundaryTitle}>Couldn&apos;t read this label</Text>
          <Text style={styles.boundaryText}>{extractionError}</Text>
          <SecondaryButton
            disabled={extracting}
            label="Review Label Manually"
            onPress={reviewLabelManually}
          />
        </View>
      ) : null}

      <SecondaryButton
        disabled={capturing || extracting}
        label="Enter Manually"
        onPress={enterManualFood}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: Spacing.xl,
    paddingBottom: Spacing.section,
  },
  choiceGrid: {
    gap: Spacing.lg,
  },
  choiceGridWide: {
    flexDirection: 'row',
  },
  choiceCard: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: Radii.feature,
    borderWidth: 1,
    gap: Spacing.md,
    minHeight: 220,
    padding: Spacing.xxl,
  },
  choiceCardWide: {
    flex: 1,
    minWidth: 0,
  },
  cardPressed: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accentStrong,
  },
  choiceIcon: {
    alignItems: 'center',
    backgroundColor: Colors.accent,
    borderRadius: Radii.card,
    height: 64,
    justifyContent: 'center',
    width: 64,
  },
  choiceGlyph: {
    color: Colors.primary,
    fontSize: Typography.sizes.metric,
    fontWeight: Typography.weights.bold,
    lineHeight: Typography.lineHeights.metric,
  },
  choiceTitle: {
    color: Colors.text,
    fontSize: Typography.sizes.section,
    fontWeight: Typography.weights.bold,
    lineHeight: Typography.lineHeights.section,
  },
  choiceDescription: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.body,
    lineHeight: Typography.lineHeights.body,
  },
  cameraShell: {
    backgroundColor: Colors.text,
    borderRadius: Radii.feature,
    overflow: 'hidden',
    position: 'relative',
    width: '100%',
  },
  guideFrame: {
    alignItems: 'center',
    borderColor: Colors.accentStrong,
    borderRadius: Radii.input,
    borderWidth: 3,
    bottom: '12%',
    justifyContent: 'flex-start',
    left: '10%',
    paddingTop: Spacing.sm,
    position: 'absolute',
    right: '10%',
    top: '12%',
  },
  guideText: {
    backgroundColor: 'rgba(16, 23, 19, 0.72)',
    borderRadius: Radii.pill,
    color: Colors.onPrimary,
    fontSize: Typography.sizes.caption,
    lineHeight: Typography.lineHeights.caption,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  torchButton: {
    backgroundColor: 'rgba(16, 23, 19, 0.78)',
    borderColor: 'rgba(255, 255, 255, 0.45)',
    borderRadius: Radii.pill,
    borderWidth: 1,
    minHeight: 44,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    position: 'absolute',
    right: Spacing.md,
    top: Spacing.md,
  },
  torchText: {
    color: Colors.onPrimary,
    fontSize: Typography.sizes.small,
    fontWeight: Typography.weights.semibold,
    lineHeight: Typography.lineHeights.small,
  },
  controlPressed: {
    opacity: 0.76,
  },
  sourceBadge: {
    backgroundColor: Colors.accent,
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  sourceBadgeText: {
    color: Colors.primary,
    fontSize: Typography.sizes.caption,
    fontWeight: Typography.weights.semibold,
    lineHeight: Typography.lineHeights.caption,
  },
  previewShell: {
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: Radii.feature,
    borderWidth: 1,
    justifyContent: 'center',
    overflow: 'hidden',
    padding: Spacing.md,
    width: '100%',
  },
  previewImage: {
    height: '100%',
    width: '100%',
  },
  previewActions: {
    gap: Spacing.md,
  },
  previewActionsWide: {
    flexDirection: 'row',
  },
  flexAction: {
    flex: 1,
  },
  errorCard: {
    backgroundColor: '#FCEAEA',
    borderColor: '#F2C7C7',
    borderRadius: Radii.card,
    borderWidth: 1,
    padding: Spacing.lg,
  },
  errorText: {
    color: Colors.error,
    fontSize: Typography.sizes.small,
    lineHeight: Typography.lineHeights.small,
  },
  boundaryCard: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accentStrong,
    borderRadius: Radii.card,
    borderWidth: 1,
    gap: Spacing.md,
    padding: Spacing.lg,
  },
  boundaryTitle: {
    color: Colors.primary,
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.bold,
    lineHeight: Typography.lineHeights.body,
  },
  boundaryText: {
    color: Colors.text,
    fontSize: Typography.sizes.small,
    lineHeight: Typography.lineHeights.small,
  },
});
