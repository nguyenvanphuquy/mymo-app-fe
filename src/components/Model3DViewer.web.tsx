import React, { useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

const MODEL_VIEWER_SCRIPT_ID = 'mymo-model-viewer-script';
const MODEL_VIEWER_SOURCES = [
  'https://cdn.jsdelivr.net/npm/@google/model-viewer@4.1.0/dist/model-viewer.min.js',
  'https://unpkg.com/@google/model-viewer@4.1.0/dist/model-viewer.min.js',
] as const;

function loadModelViewerScript(sourceIndex: number): void {
  if (customElements.get('model-viewer') || sourceIndex >= MODEL_VIEWER_SOURCES.length) return;

  document.getElementById(MODEL_VIEWER_SCRIPT_ID)?.remove();

  const script = document.createElement('script');
  script.id = MODEL_VIEWER_SCRIPT_ID;
  script.type = 'module';
  script.src = MODEL_VIEWER_SOURCES[sourceIndex];
  script.dataset.state = 'loading';
  script.onload = () => {
    script.dataset.state = 'loaded';
    // A successful HTTP response can still fail while evaluating the module.
    window.setTimeout(() => {
      if (!customElements.get('model-viewer')) loadModelViewerScript(sourceIndex + 1);
    }, 1000);
  };
  script.onerror = () => loadModelViewerScript(sourceIndex + 1);
  document.head.appendChild(script);
}

export function ensureModelViewerLoaded(): void {
  if (typeof document === 'undefined' || customElements.get('model-viewer')) return;

  const currentScript = document.getElementById(MODEL_VIEWER_SCRIPT_ID) as HTMLScriptElement | null;
  if (currentScript?.dataset.state === 'loading') return;

  loadModelViewerScript(0);
}

export default function Model3DViewer({
  src,
  style,
  cameraControls = true,
}: {
  src: string;
  style?: StyleProp<ViewStyle>;
  cameraControls?: boolean;
}) {
  useEffect(ensureModelViewerLoaded, []);

  return (
    <View style={[styles.wrap, style]}>
      {React.createElement('model-viewer', {
        key: src,
        src,
        alt: 'Mô hình 3D của cơ sở',
        'camera-controls': cameraControls ? '' : undefined,
        'camera-orbit': '0deg 65deg auto',
        'min-camera-orbit': 'auto 45deg auto',
        'max-camera-orbit': 'auto 82deg auto',
        'shadow-intensity': '1',
        'interaction-prompt': 'none',
        exposure: '1',
        loading: 'eager',
        reveal: 'auto',
        style: {
          width: '100%',
          height: '100%',
          display: 'block',
          background: 'linear-gradient(180deg,#FFF9FF,#FBEAF9)',
          '--progress-bar-height': '0px',
          '--progress-bar-color': 'transparent',
        },
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
    backgroundColor: '#FBEAF9',
  },
});
