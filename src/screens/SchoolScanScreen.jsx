import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, ArrowLeft, Camera, CheckCircle2, MapPin, QrCode, RotateCcw } from 'lucide-react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Button } from '../components/ui/Button.jsx';
import { Text } from '../components/ui/Text.jsx';
import { buildApiUrl } from '../services/apiUrl.js';
import { colors } from '../theme/colors.js';

function readRouteParams() {
  const hashQuery = window.location.hash.includes('?')
    ? window.location.hash.split('?').slice(1).join('?')
    : '';
  const searchParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(hashQuery);

  return {
    token: searchParams.get('token') || hashParams.get('token') || '',
    studentClass: searchParams.get('class') || hashParams.get('class') || '',
    stream: searchParams.get('stream') || hashParams.get('stream') || '',
    schoolType: searchParams.get('schoolType') || hashParams.get('schoolType') || '',
    location: searchParams.get('schoolLocation') || hashParams.get('schoolLocation') || 'School Location',
    point: searchParams.get('scanPoint') || hashParams.get('scanPoint') || 'Main gate'
  };
}

function parseCardPayload(value) {
  const raw = String(value || '').trim();
  if (!raw) {
    return { token: '', studentClass: '', stream: '', schoolType: '' };
  }

  try {
    const json = JSON.parse(raw);
    if (json && typeof json === 'object') {
      return {
        token: String(json.token || json.card || json.cardToken || json.studentId || raw).trim(),
        studentClass: String(json.class || json.studentClass || json.grade || '').trim(),
        stream: String(json.stream || json.classStream || '').trim(),
        schoolType: String(json.schoolType || json.type || '').trim()
      };
    }
  } catch {}

  try {
    const url = new URL(raw, window.location.origin);
    return {
      token: url.searchParams.get('token') || url.searchParams.get('card') || raw,
      studentClass: url.searchParams.get('class') || url.searchParams.get('studentClass') || url.searchParams.get('grade') || '',
      stream: url.searchParams.get('stream') || url.searchParams.get('classStream') || '',
      schoolType: url.searchParams.get('schoolType') || url.searchParams.get('type') || ''
    };
  } catch {
    const pairs = Object.fromEntries(
      raw
        .split(/[|,;\n]/)
        .map((part) => part.split(/[:=]/).map((item) => item.trim()))
        .filter(([key, value]) => key && value)
        .map(([key, value]) => [key.toLowerCase(), value])
    );
    const parts = raw.split('|').map((part) => part.trim()).filter(Boolean);

    return {
      token: pairs.token || pairs.card || pairs.cardtoken || parts[0] || raw,
      studentClass: pairs.class || pairs.studentclass || pairs.grade || parts[1] || '',
      stream: pairs.stream || pairs.classstream || parts[2] || '',
      schoolType: pairs.schooltype || pairs.type || parts[3] || ''
    };
  }
}

function extractCardToken(value) {
  return parseCardPayload(value).token;
}

async function submitSchoolScan(payload) {
  const response = await fetch(buildApiUrl('/api/school/scan'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify(payload)
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || 'Could not save school gate scan.');
  }

  return data;
}

export function SchoolScanScreen() {
  const initialParams = useMemo(readRouteParams, []);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const frameRef = useRef(0);
  const [cardToken, setCardToken] = useState(() => extractCardToken(initialParams.token));
  const [studentClass, setStudentClass] = useState(initialParams.studentClass);
  const [stream, setStream] = useState(initialParams.stream);
  const [schoolType, setSchoolType] = useState(initialParams.schoolType);
  const [schoolLocation, setSchoolLocation] = useState(initialParams.location);
  const [scanPoint, setScanPoint] = useState(initialParams.point);
  const [direction, setDirection] = useState('entry');
  const [cameraState, setCameraState] = useState('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [lastResult, setLastResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const canDecodeQr = typeof window !== 'undefined' && 'BarcodeDetector' in window;

  function stopCamera() {
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = 0;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }

  async function startCamera() {
    setStatusMessage('');

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraState('unsupported');
      setStatusMessage('This browser cannot open the camera. Enter the QR token manually.');
      return;
    }

    if (!canDecodeQr) {
      setCameraState('unsupported');
      setStatusMessage('Camera opened is not supported for QR detection on this browser. Enter the QR token manually.');
      return;
    }

    try {
      stopCamera();
      setCameraState('starting');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });
      streamRef.current = stream;

      const video = videoRef.current;
      video.srcObject = stream;
      await video.play();

      const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
      setCameraState('scanning');

      const scanFrame = async () => {
        if (!videoRef.current || cameraState === 'saved') return;

        try {
          const codes = await detector.detect(videoRef.current);
          const value = codes[0]?.rawValue;
          if (value) {
            const card = parseCardPayload(value);
            setCardToken(card.token);
            if (card.studentClass) setStudentClass(card.studentClass);
            if (card.stream) setStream(card.stream);
            if (card.schoolType) setSchoolType(card.schoolType);
            setStatusMessage(
              card.studentClass && card.stream
                ? 'QR found with class and stream. Confirm the details and save the scan.'
                : 'QR found. Enter the class and stream if they are not shown, then save the scan.'
            );
            stopCamera();
            setCameraState('detected');
            return;
          }
        } catch {
          setStatusMessage('Could not read the QR frame yet. Keep the card steady in the camera.');
        }

        frameRef.current = requestAnimationFrame(scanFrame);
      };

      frameRef.current = requestAnimationFrame(scanFrame);
    } catch (error) {
      stopCamera();
      setCameraState('blocked');
      setStatusMessage(error.message || 'Camera permission was blocked. Allow camera access or enter the token manually.');
    }
  }

  async function saveScan() {
    const token = extractCardToken(cardToken);
    setStatusMessage('');
    setLastResult(null);

    if (!token) {
      setStatusMessage('Scan or enter the student card QR token first.');
      return;
    }

    if (!schoolLocation.trim()) {
      setStatusMessage('Enter the school location.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await submitSchoolScan({
        token,
        direction,
        studentClass: studentClass.trim(),
        stream: stream.trim(),
        schoolType: schoolType.trim(),
        gradeUpdateBy: schoolType.toLowerCase().includes('boarding') ? 'class_teacher' : schoolType.toLowerCase().includes('day') ? 'parent' : '',
        schoolLocation: schoolLocation.trim(),
        scanPoint: scanPoint.trim() || 'Main gate',
        scannedUrl: window.location.href
      });
      setLastResult(result);
      setStatusMessage(result.message || 'School gate scan saved.');
      setCameraState('saved');
    } catch (error) {
      setStatusMessage(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  function clearScan() {
    setCardToken('');
    setStudentClass('');
    setStream('');
    setSchoolType('');
    setLastResult(null);
    setStatusMessage('');
    setCameraState('idle');
  }

  useEffect(() => {
    startCamera();
    return stopCamera;
  }, []);

  return (
    <View style={styles.root}>
      <View style={styles.shell}>
        <Pressable onPress={() => { window.location.href = '/'; }} style={styles.backLink}>
          <ArrowLeft size={18} color={colors.primary} />
          <Text style={styles.backText}>Back to site</Text>
        </Pressable>

        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <QrCode size={28} color={colors.primary} />
          </View>
          <View style={styles.headerCopy}>
            <Text style={styles.kicker}>School Location</Text>
            <Text style={styles.title}>Student card QR scan</Text>
            <Text style={styles.subtitle}>
              Open this scanned URL at the school gate. The camera reads the card token, records entry or exit, and prepares the parent notification flow.
            </Text>
          </View>
        </View>

        <View style={styles.grid}>
          <View style={styles.cameraCard}>
            <View style={styles.cameraHeader}>
              <View>
                <Text style={styles.cardTitle}>Camera scanner</Text>
                <Text style={styles.cardText}>Point the phone camera at the student card QR.</Text>
              </View>
              <View style={styles.cameraBadge}>
                <Camera size={15} color={colors.primary} />
                <Text style={styles.cameraBadgeText}>{cameraState === 'scanning' ? 'Scanning' : 'Ready'}</Text>
              </View>
            </View>

            <View style={styles.videoWrap}>
              <video
                ref={videoRef}
                muted
                playsInline
                style={styles.video}
              />
              {cameraState !== 'scanning' ? (
                <View style={styles.videoOverlay}>
                  <QrCode size={42} color="#ffffff" />
                  <Text style={styles.videoText}>
                    {cameraState === 'detected' ? 'QR token detected' : 'Tap start scanner to use camera'}
                  </Text>
                </View>
              ) : null}
            </View>

            <View style={styles.cameraActions}>
              <Button icon={Camera} onPress={startCamera} disabled={submitting}>
                Open camera scanner
              </Button>
              <Button icon={RotateCcw} variant="secondary" onPress={clearScan}>
                Clear
              </Button>
            </View>
          </View>

          <View style={styles.formCard}>
            <View style={styles.formHeader}>
              <MapPin size={22} color={colors.primary} />
              <View>
                <Text style={styles.cardTitle}>School scan details</Text>
                <Text style={styles.cardText}>Class and stream must show on the student card details before saving.</Text>
              </View>
            </View>

            <View style={styles.cardDetailsPanel}>
              <Text style={styles.cardDetailsTitle}>Student card details</Text>
              <View style={styles.cardDetails}>
                <View style={styles.cardDetailItem}>
                  <Text style={styles.cardDetailLabel}>Class / grade</Text>
                  <Text style={styles.cardDetailValue}>{studentClass || 'Enter class'}</Text>
                </View>
                <View style={styles.cardDetailItem}>
                  <Text style={styles.cardDetailLabel}>Stream</Text>
                  <Text style={styles.cardDetailValue}>{stream || 'Enter stream'}</Text>
                </View>
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Student card QR</Text>
              <Pressable
                onPress={startCamera}
                disabled={submitting}
                style={({ pressed }) => [
                  styles.scanTrigger,
                  pressed && styles.scanTriggerPressed,
                  cardToken && styles.scanTriggerDone
                ]}
              >
                <View style={styles.scanTriggerIcon}>
                  {cardToken ? <CheckCircle2 size={24} color={colors.success} /> : <Camera size={24} color={colors.primary} />}
                </View>
                <View style={styles.scanTriggerCopy}>
                  <Text style={styles.scanTriggerTitle}>
                    {cardToken ? 'Card QR scanned' : 'Tap to open camera'}
                  </Text>
                  <Text style={styles.scanTriggerText}>
                    {cardToken ? cardToken : 'Scan the student card code at the school gate.'}
                  </Text>
                </View>
              </Pressable>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Manual QR token fallback</Text>
              <TextInput
                value={cardToken}
                onChangeText={(value) => {
                  const card = parseCardPayload(value);
                  setCardToken(card.token);
                  if (card.studentClass) setStudentClass(card.studentClass);
                  if (card.stream) setStream(card.stream);
                  if (card.schoolType) setSchoolType(card.schoolType);
                }}
                placeholder="Only type here if camera cannot scan"
                placeholderTextColor="#8ba0b8"
                style={styles.input}
              />
            </View>

            <View style={styles.cardDetails}>
              <View style={styles.cardDetailItem}>
                <Text style={styles.cardDetailLabel}>School type</Text>
                <Text style={styles.cardDetailValue}>{schoolType || 'Not set'}</Text>
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.field, styles.halfField]}>
                <Text style={styles.label}>Class</Text>
                <TextInput
                  value={studentClass}
                  onChangeText={setStudentClass}
                  placeholder="e.g. Grade 6"
                  placeholderTextColor="#8ba0b8"
                  style={styles.input}
                />
              </View>
              <View style={[styles.field, styles.halfField]}>
                <Text style={styles.label}>Stream</Text>
                <TextInput
                  value={stream}
                  onChangeText={setStream}
                  placeholder="e.g. Blue"
                  placeholderTextColor="#8ba0b8"
                  style={styles.input}
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>School type</Text>
              <View style={styles.row}>
                <Pressable
                  onPress={() => setSchoolType('boarding')}
                  style={[styles.segment, schoolType === 'boarding' && styles.segmentActive]}
                >
                  <Text style={[styles.segmentText, schoolType === 'boarding' && styles.segmentTextActive]}>Boarding</Text>
                </Pressable>
                <Pressable
                  onPress={() => setSchoolType('day')}
                  style={[styles.segment, schoolType === 'day' && styles.segmentActive]}
                >
                  <Text style={[styles.segmentText, schoolType === 'day' && styles.segmentTextActive]}>Day school</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.row}>
              <Pressable
                onPress={() => setDirection('entry')}
                style={[styles.segment, direction === 'entry' && styles.segmentActive]}
              >
                <Text style={[styles.segmentText, direction === 'entry' && styles.segmentTextActive]}>Coming in</Text>
              </Pressable>
              <Pressable
                onPress={() => setDirection('exit')}
                style={[styles.segment, direction === 'exit' && styles.segmentActive]}
              >
                <Text style={[styles.segmentText, direction === 'exit' && styles.segmentTextActive]}>Going out</Text>
              </Pressable>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>School location</Text>
              <TextInput
                value={schoolLocation}
                onChangeText={setSchoolLocation}
                placeholder="School Location"
                placeholderTextColor="#8ba0b8"
                style={styles.input}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Gate or scan point</Text>
              <TextInput
                value={scanPoint}
                onChangeText={setScanPoint}
                placeholder="Main gate"
                placeholderTextColor="#8ba0b8"
                style={styles.input}
              />
            </View>

            {statusMessage ? (
              <View style={[styles.notice, lastResult?.ok ? styles.noticeSuccess : styles.noticeWarn]}>
                {lastResult?.ok ? <CheckCircle2 size={18} color={colors.success} /> : <AlertCircle size={18} color={colors.warning} />}
                <Text style={[styles.noticeText, lastResult?.ok ? styles.successText : styles.warnText]}>{statusMessage}</Text>
              </View>
            ) : null}

            <Button icon={CheckCircle2} onPress={saveScan} disabled={submitting} style={styles.saveButton}>
              {submitting ? 'Saving scan...' : 'Save school gate scan'}
            </Button>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    minHeight: 'var(--app-vh)',
    backgroundColor: '#eef6ff',
    padding: 18,
    overflowY: 'auto'
  },
  shell: {
    width: '100%',
    maxWidth: 1120,
    marginHorizontal: 'auto',
    gap: 16
  },
  backLink: {
    alignSelf: 'flex-start',
    minHeight: 38,
    borderWidth: 1,
    borderColor: '#cfe0fb',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    cursor: 'pointer'
  },
  backText: {
    color: colors.primary,
    fontWeight: '600'
  },
  header: {
    borderWidth: 1,
    borderColor: '#cfe0fb',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    padding: 20,
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start'
  },
  headerIcon: {
    width: 52,
    height: 52,
    borderRadius: 8,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center'
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
    gap: 6
  },
  kicker: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase'
  },
  title: {
    color: colors.text,
    fontSize: 31,
    lineHeight: 38,
    fontWeight: '600'
  },
  subtitle: {
    color: colors.slate,
    fontSize: 16,
    lineHeight: 24
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    alignItems: 'stretch'
  },
  cameraCard: {
    flex: 1.1,
    minWidth: 300,
    borderWidth: 1,
    borderColor: '#d5e2ef',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    padding: 16,
    gap: 14
  },
  formCard: {
    flex: 0.9,
    minWidth: 300,
    borderWidth: 1,
    borderColor: '#d5e2ef',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    padding: 16,
    gap: 13
  },
  cameraHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'flex-start',
    flexWrap: 'wrap'
  },
  cardTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '600'
  },
  cardText: {
    color: colors.muted,
    marginTop: 4,
    lineHeight: 20
  },
  cameraBadge: {
    minHeight: 32,
    borderWidth: 1,
    borderColor: '#cfe0fb',
    borderRadius: 8,
    paddingHorizontal: 10,
    backgroundColor: colors.primarySoft,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  cameraBadgeText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '600'
  },
  videoWrap: {
    position: 'relative',
    aspectRatio: 1.35,
    minHeight: 260,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#07152b'
  },
  video: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    backgroundColor: '#07152b'
  },
  videoOverlay: {
    position: 'absolute',
    inset: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(7,21,43,0.72)'
  },
  videoText: {
    color: '#ffffff',
    fontWeight: '600'
  },
  cameraActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10
  },
  formHeader: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start'
  },
  field: {
    gap: 7
  },
  halfField: {
    flex: 1,
    minWidth: 130
  },
  label: {
    color: colors.slate,
    fontSize: 13,
    fontWeight: '600'
  },
  scanTrigger: {
    minHeight: 76,
    borderWidth: 1,
    borderColor: '#cfe0fb',
    borderRadius: 8,
    backgroundColor: '#f8fbff',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    cursor: 'pointer'
  },
  scanTriggerPressed: {
    transform: [{ scale: 0.99 }],
    backgroundColor: '#eef6ff'
  },
  scanTriggerDone: {
    borderColor: '#bfe7d4',
    backgroundColor: colors.successSoft
  },
  scanTriggerIcon: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dbe7f5',
    alignItems: 'center',
    justifyContent: 'center'
  },
  scanTriggerCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3
  },
  scanTriggerTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600'
  },
  scanTriggerText: {
    color: colors.muted,
    lineHeight: 20
  },
  input: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: '#cfddec',
    borderRadius: 8,
    paddingHorizontal: 12,
    color: colors.text,
    backgroundColor: '#ffffff',
    outlineStyle: 'none',
    fontSize: 16
  },
  cardDetailsPanel: {
    borderWidth: 1,
    borderColor: '#bcd7ff',
    borderRadius: 8,
    backgroundColor: '#eef6ff',
    padding: 12,
    gap: 10
  },
  cardDetailsTitle: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase'
  },
  cardDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  cardDetailItem: {
    flex: 1,
    minWidth: 130,
    borderWidth: 1,
    borderColor: '#d5e6ff',
    borderRadius: 8,
    backgroundColor: '#f8fbff',
    padding: 11,
    gap: 4
  },
  cardDetailLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase'
  },
  cardDetailValue: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600'
  },
  row: {
    flexDirection: 'row',
    gap: 8
  },
  segment: {
    flex: 1,
    minHeight: 42,
    borderWidth: 1,
    borderColor: '#cfddec',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer'
  },
  segmentActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  segmentText: {
    color: colors.slate,
    fontWeight: '600'
  },
  segmentTextActive: {
    color: '#ffffff'
  },
  notice: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 11,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8
  },
  noticeWarn: {
    borderColor: '#f3d29a',
    backgroundColor: colors.warningSoft
  },
  noticeSuccess: {
    borderColor: '#bfe7d4',
    backgroundColor: colors.successSoft
  },
  noticeText: {
    flex: 1,
    lineHeight: 20,
    fontWeight: '500'
  },
  warnText: {
    color: '#8a5a12'
  },
  successText: {
    color: colors.success
  },
  saveButton: {
    width: '100%'
  }
});
