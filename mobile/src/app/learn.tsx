import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Alert, BackHandler, Linking, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView, type WebViewNavigation } from 'react-native-webview';
import type { ShouldStartLoadRequest } from 'react-native-webview/lib/WebViewTypes';

import { Button, Notice, ProgressBar } from '../components/ui';
import { decideNavigation, siteUrl, type NavigationDecision, type NativeRoute } from '../lib/url-policy';
import { useSession } from '../lib/session';
import { buildSessionScript, parseBridgeMessage } from '../lib/web-bridge';
import { colors, MIN_TOUCH, space } from '../theme';

const NATIVE_TARGETS: Record<NativeRoute, '/sign-in' | '/sign-up' | '/verify' | '/forgot-password' | '/(tabs)/account' | '/pro'> = {
  '/sign-in': '/sign-in',
  '/sign-up': '/sign-up',
  '/verify': '/verify',
  '/forgot-password': '/forgot-password',
  '/account': '/(tabs)/account',
  '/pro': '/pro',
};

export default function Learn() {
  const params = useLocalSearchParams<{ path?: string; title?: string }>();
  const startUrl = useMemo(() => siteUrl(String(params.path ?? '')), [params.path]);
  const { session, endLocalSession } = useSession();
  const webRef = useRef<WebView>(null);
  const [uri, setUri] = useState(startUrl);
  const [canGoBack, setCanGoBack] = useState(false);
  const [progress, setProgress] = useState(0);
  const [failure, setFailure] = useState<string | null>(null);
  const [generation, setGeneration] = useState(0);

  const injected = useMemo(() => buildSessionScript(session), [session]);

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        if (canGoBack) {
          webRef.current?.goBack();
          return true;
        }
        return false;
      });
      return () => sub.remove();
    }, [canGoBack]),
  );

  const leave = useCallback((url: string, mail: boolean) => {
    if (mail) {
      void Linking.openURL(url).catch(() => Alert.alert('No email app', url.replace(/^mailto:/u, '')));
      return;
    }
    void WebBrowser.openBrowserAsync(url, { dismissButtonStyle: 'close', readerMode: false });
  }, []);

  const act = useCallback(
    (decision: NavigationDecision, isTopFrame: boolean): boolean => {
      switch (decision.kind) {
        case 'allow':
          return true;
        case 'redirect':
          setUri(decision.url);
          return false;
        case 'native':
          router.push(NATIVE_TARGETS[decision.route]);
          return false;
        case 'download':
          Alert.alert('Open the file in your browser?', 'Datasets download through your browser, not inside the app.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open', onPress: () => leave(decision.url, false) },
          ]);
          return false;
        case 'external': {
          const mail = decision.url.startsWith('mailto:');
          const where = mail ? decision.url.replace(/^mailto:/u, '') : new URL(decision.url).hostname;
          Alert.alert(mail ? 'Write an email?' : 'Leave Data For Dummies?', mail ? where : `This link opens ${where} in your browser.`, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open', onPress: () => leave(decision.url, mail) },
          ]);
          return false;
        }
        case 'block':
          if (isTopFrame) Alert.alert('Not available in the app', decision.reason);
          return false;
        default: {
          const unhandled: never = decision;
          return unhandled;
        }
      }
    },
    [leave],
  );

  const onShouldStart = useCallback(
    (request: ShouldStartLoadRequest) => {
      const isTopFrame = request.isTopFrame ?? true;
      return act(decideNavigation(request.url, isTopFrame), isTopFrame);
    },
    [act],
  );

  const onNavigationStateChange = useCallback((state: WebViewNavigation) => {
    setCanGoBack(state.canGoBack);
  }, []);

  const reload = useCallback(() => {
    setFailure(null);
    setGeneration((value) => value + 1);
  }, []);

  if (!startUrl || !uri) {
    return (
      <SafeAreaView style={styles.center} edges={['left', 'right', 'bottom']}>
        <Notice tone="error">That page is not on datafordummies.in, so the app will not open it.</Notice>
        <Button label="Go back" onPress={() => router.back()} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['left', 'right', 'bottom']}>
      <Stack.Screen
        options={{
          title: String(params.title ?? ''),
          headerRight: () => (
            <Pressable accessibilityRole="button" accessibilityLabel="Reload page" onPress={reload} style={styles.headerButton} hitSlop={8}>
              <Ionicons name="refresh" size={22} color={colors.accent} />
            </Pressable>
          ),
        }}
      />
      {progress < 1 && !failure ? <ProgressBar value={progress * 100} label="Page loading" /> : null}
      {failure ? (
        <View style={styles.center}>
          <Notice tone="warn">{failure}</Notice>
          <Button label="Try again" icon="refresh" onPress={reload} />
        </View>
      ) : (
        <WebView
          key={`${session?.token ?? 'guest'}:${generation}`}
          ref={webRef}
          testID="lesson-webview"
          source={{ uri }}
          originWhitelist={['*']}
          onShouldStartLoadWithRequest={onShouldStart}
          onOpenWindow={(event) => {
            const target = event.nativeEvent.targetUrl;
            if (act(decideNavigation(target, true), true)) setUri(target);
          }}
          injectedJavaScriptBeforeContentLoaded={injected}
          injectedJavaScriptBeforeContentLoadedForMainFrameOnly
          onMessage={(event) => {
            const message = parseBridgeMessage(event.nativeEvent.data, event.nativeEvent.url);
            if (message) void endLocalSession();
          }}
          onNavigationStateChange={onNavigationStateChange}
          onLoadProgress={(event) => setProgress(event.nativeEvent.progress)}
          onLoadEnd={() => setProgress(1)}
          onError={() => setFailure('The page did not load. Check your connection and try again.')}
          onHttpError={(event) => {
            if (event.nativeEvent.statusCode >= 400 && event.nativeEvent.url === uri) {
              setFailure(`The page answered with HTTP ${event.nativeEvent.statusCode}.`);
            }
          }}
          onContentProcessDidTerminate={reload}
          onRenderProcessGone={reload}
          onFileDownload={() => Alert.alert('Not available in the app', 'Use the website on a computer to download or export files.')}
          javaScriptEnabled
          domStorageEnabled
          javaScriptCanOpenWindowsAutomatically={false}
          setSupportMultipleWindows={false}
          allowFileAccess={false}
          allowFileAccessFromFileURLs={false}
          allowUniversalAccessFromFileURLs={false}
          allowsLinkPreview={false}
          allowsBackForwardNavigationGestures
          mixedContentMode="never"
          geolocationEnabled={false}
          mediaCapturePermissionGrantType="deny"
          sharedCookiesEnabled={false}
          thirdPartyCookiesEnabled={false}
          paymentRequestEnabled={false}
          fraudulentWebsiteWarningEnabled
          webviewDebuggingEnabled={__DEV__}
          applicationNameForUserAgent="DataForDummiesApp"
          pullToRefreshEnabled
          style={styles.web}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  web: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, padding: space(3), gap: space(2), justifyContent: 'center', backgroundColor: colors.wash },
  headerButton: { minWidth: MIN_TOUCH, minHeight: MIN_TOUCH - 8, alignItems: 'center', justifyContent: 'center' },
});
