import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Image } from 'react-native';
import '../../../features/register/register.css';

const steps = ['Rider', 'Documents', 'Next of Kin', 'Bike', 'Review'];

const emptyForm = (settings = {}) => ({
  fullName: '',
  nationalId: '',
  phone: '',
  gender: '',
  location: settings.defaultRegion || 'Nairobi',
  passport: '',
  passportPreview: '',
  idFront: '',
  idFrontPreview: '',
  idBack: '',
  idBackPreview: '',
  idScan: '',
  idScanPreview: '',
  idScanText: '',
  kinName: '',
  kinPhone: '',
  relationship: '',
  bikeModel: settings.defaultBikeModel || 'Boxer 150',
  chassis: '',
  deposit: '',
  installment: settings.defaultInstallment || 'Daily KES 300',
});

const formatKes = (amount) => `KES ${Number(amount || 0).toLocaleString('en-KE')}`;
const riderStatus = (rider) => {
  const remaining = Number(rider.remaining || 0);
  if (remaining <= 0) return 'Paid all / cleared';
  if (rider.overdue) return `Has overdue debt: ${formatKes(remaining)}`;
  return `Has active debt: ${formatKes(remaining)}`;
};

const hasActiveDebt = (rider) => Number(rider.remaining || 0) > 0;
const clean = (value) => String(value || '').trim().toLowerCase();
const cleanPhone = (value) => String(value || '').replace(/[\s-]/g, '');
const isSixDigitOtp = (value) => /^\d{6}$/.test(String(value || '').trim());

export default function RegisterRider({ theme, selectedAction = '', settings, customers, agent = {}, onSubmitRider }) {
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(() => emptyForm(settings));
  const [errors, setErrors] = useState({});
  const [lastSavedAt, setLastSavedAt] = useState('');
  const [cameraTarget, setCameraTarget] = useState(null);
  const [cameraError, setCameraError] = useState('');
  const [customerOtp, setCustomerOtp] = useState('');
  const [customerOtpSent, setCustomerOtpSent] = useState(false);
  const [kinOtp, setKinOtp] = useState('');
  const [kinOtpSent, setKinOtpSent] = useState(false);
  const [kinConsent, setKinConsent] = useState('');
  const videoRef = useRef(null);

  useEffect(() => {
    const actionStep = {
      'Search identity first': 0,
      'Capture rider profile': 0,
      'Attach documents': 1,
      'Assign bike and payment plan': 3,
      'Review and submit': 4,
    };
    if (selectedAction && actionStep[selectedAction] !== undefined) {
      setStep(actionStep[selectedAction]);
    }
  }, [selectedAction]);

  const update = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setLastSavedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  };

  const duplicateMatches = customers.filter((customer) => (
    (form.nationalId && clean(customer.nationalId) === clean(form.nationalId))
    || (form.phone && cleanPhone(customer.phone) === cleanPhone(form.phone))
    || (form.chassis && clean(customer.chassis) === clean(form.chassis))
  ));

  const validate = (targetStep = step) => {
    const next = {};
    const required = (key, label) => {
      if (!String(form[key] || '').trim()) next[key] = `${label} is required`;
    };
    if (targetStep === 0) {
      ['fullName', 'nationalId', 'phone', 'gender', 'location'].forEach((key) => required(key, key.replace(/([A-Z])/g, ' $1')));
      if (form.phone && !/^(?:\+254|254|0)(?:7|1)\d{8}$/.test(String(form.phone).replace(/[\s-]/g, ''))) next.phone = 'Use +2547..., +2541..., 07..., or 01...';
      if (form.nationalId && !/^\d{7,8}$/.test(form.nationalId.trim())) next.nationalId = 'National ID should be 7 to 8 digits';
      if (!customerOtpSent) next.customerOtp = 'Send OTP to rider phone first';
      if (customerOtpSent && !isSixDigitOtp(customerOtp)) next.customerOtp = 'Enter the 6-digit OTP sent to rider phone';
    }
    if (targetStep === 1) ['passport', 'idFront', 'idBack', 'idScan'].forEach((key) => required(key, key.replace(/([A-Z])/g, ' $1')));
    if (targetStep === 2) ['kinName', 'kinPhone', 'relationship'].forEach((key) => required(key, key.replace(/([A-Z])/g, ' $1')));
    if (targetStep === 2) {
      if (!kinOtpSent) next.kinOtp = 'Send OTP to next of kin first';
      if (kinOtpSent && !isSixDigitOtp(kinOtp)) next.kinOtp = 'Enter the 6-digit OTP sent to next of kin';
      if (isSixDigitOtp(kinOtp) && kinConsent !== 'yes') next.kinConsent = 'Next of kin must approve with Yes';
    }
    if (targetStep === 3) ['bikeModel', 'chassis', 'deposit', 'installment'].forEach((key) => required(key, key.replace(/([A-Z])/g, ' $1')));
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const nextStep = () => {
    if (validate() && step < steps.length - 1) setStep(step + 1);
  };

  const submit = () => {
    const invalid = [0, 1, 2, 3].find((item) => !validate(item));
    if (invalid !== undefined) {
      setStep(invalid);
      return;
    }
    const result = onSubmitRider(form);
    const success = result === true || result?.success;
    if (!success) {
      setErrors((current) => ({ ...current, duplicate: result?.message || 'Registration blocked: rider already has an active account.' }));
      return;
    }
    setForm(emptyForm(settings));
    setCustomerOtp('');
    setCustomerOtpSent(false);
    setKinOtp('');
    setKinOtpSent(false);
    setKinConsent('');
    setStep(0);
  };

  const renderField = (name, label, type = 'default') => (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput style={styles.input} value={form[name]} onChangeText={(value) => update(name, value)} keyboardType={type} />
      {!!errors[name] && <Text style={styles.error}>{errors[name]}</Text>}
    </View>
  );

  const closeCamera = () => {
    cameraTarget?.stream?.getTracks?.().forEach((track) => track.stop());
    setCameraTarget(null);
  };

  const openCaptureFallback = (name, label, facingMode = 'environment') => {
    if (typeof document === 'undefined') {
      setCameraError('Camera is not available on this device.');
      return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.setAttribute('capture', facingMode);
    input.style.position = 'fixed';
    input.style.left = '-9999px';
    document.body.appendChild(input);
    const cleanup = () => input.remove();
    input.onchange = (event) => {
      const file = event.target.files?.[0];
      if (!file) {
        setCameraError('No photo was selected.');
        cleanup();
        return;
      }
      update(name, `Scanned: ${label}`);
      const reader = new FileReader();
      reader.onload = () => {
        update(`${name}Preview`, String(reader.result || ''));
        setCameraError('');
        cleanup();
      };
      reader.readAsDataURL(file);
    };
    input.oncancel = cleanup;
    input.click();
  };

  const openDocumentCamera = async (name, label, facingMode = 'environment') => {
    setCameraError('');
    if (!navigator?.mediaDevices?.getUserMedia) {
      openCaptureFallback(name, label, facingMode);
      return;
    }
    try {
      closeCamera();
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: facingMode } } });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }
      setCameraTarget({ name, label, stream });
      setTimeout(() => {
        if (!videoRef.current) return;
        videoRef.current.srcObject = stream;
        videoRef.current.play?.().catch(() => {
          setCameraError('Tap the camera preview or allow camera playback, then try Snap Photo.');
        });
      }, 0);
    } catch {
      setCameraError('Live camera was blocked. Opening device camera capture instead.');
      openCaptureFallback(name, label, facingMode);
    }
  };

  const snapDocumentPhoto = () => {
    const video = videoRef.current;
    if (!video || !cameraTarget) return;
    if (!video.videoWidth || !video.videoHeight) {
      setCameraError('Camera preview is not ready yet. Wait a second, then tap Snap Photo again.');
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
    update(cameraTarget.name, `Scanned: ${cameraTarget.label}`);
    update(`${cameraTarget.name}Preview`, canvas.toDataURL('image/jpeg', 0.86));
    closeCamera();
  };

  const ScanField = ({ name, label, hint }) => (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.uploadBox}>
        <Text style={styles.uploadTitle}>{form[name] || `Scan ${label}`}</Text>
        <Text style={styles.uploadHint}>{hint || 'Open camera and capture this document'}</Text>
        <View style={styles.uploadActions}>
          <TouchableOpacity style={styles.uploadActionButton} onPress={() => openDocumentCamera(name, label, /face|passport/i.test(label) ? 'user' : 'environment')}>
            <Text style={styles.uploadActionText}>📷 Camera Scan</Text>
          </TouchableOpacity>
        </View>
      </View>
      {!!form[`${name}Preview`] && <Image source={{ uri: form[`${name}Preview`] }} style={styles.uploadPreview} />}
      {!!errors[name] && <Text style={styles.error}>{errors[name]}</Text>}
    </View>
  );

  const Select = ({ name, label, options }) => (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.segmented}>
        {options.map((option) => (
          <TouchableOpacity key={option} style={[styles.segment, form[name] === option && styles.segmentActive]} onPress={() => update(name, option)}>
            <Text style={[styles.segmentText, form[name] === option && styles.segmentTextActive]}>{option}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {!!errors[name] && <Text style={styles.error}>{errors[name]}</Text>}
    </View>
  );

  const renderStep = () => {
    if (step === 0) return (
      <>
        {!!duplicateMatches.length && (
          <View style={styles.alert}>
            <Text style={styles.alertTitle}>Existing rider found</Text>
            {duplicateMatches.some(hasActiveDebt) ? (
              <Text style={styles.blockText}>Registration will be blocked until the active balance is cleared. This prevents riders from moving between agents to avoid payment.</Text>
            ) : (
              <Text style={styles.allowText}>Previous account is cleared. The system can create a new contract as a returning rider and link the old history.</Text>
            )}
            {duplicateMatches.map((item) => (
              <Text key={`${item.id}-assignment`} style={styles.subtle}>Assignment check: agent {item.assignedAgentCode || item.agentCode || 'Unknown'} | {riderStatus(item)}</Text>
            ))}
            {duplicateMatches.map((item) => (
              <Text key={item.id} style={styles.subtle}>• {item.name} — {item.phone} / {item.nationalId}</Text>
            ))}
            {!!errors.duplicate && <Text style={styles.error}>{errors.duplicate}</Text>}
          </View>
        )}
        {renderField('fullName', 'Full name')}
        {renderField('nationalId', 'National ID number', 'number-pad')}
        {renderField('phone', 'Phone number', 'phone-pad')}
        <View style={styles.otpPanel}>
          <Text style={styles.label}>Rider phone ownership OTP</Text>
          <Text style={styles.subtle}>Send an OTP to the rider phone number to confirm the customer owns this number before continuing.</Text>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => {
              setCustomerOtpSent(true);
              setCustomerOtp('');
              setErrors((current) => ({ ...current, customerOtp: '' }));
            }}
          >
            <Text style={styles.secondaryText}>{customerOtpSent ? 'Resend OTP' : 'Send OTP'}</Text>
          </TouchableOpacity>
          {customerOtpSent && (
            <>
              <TextInput
                style={styles.input}
                value={customerOtp}
                onChangeText={setCustomerOtp}
                keyboardType="number-pad"
                maxLength={6}
                placeholder="Enter rider OTP"
                placeholderTextColor={theme === 'dark' ? '#7f93a8' : '#8a97a8'}
              />
            </>
          )}
          {!!errors.customerOtp && <Text style={styles.error}>{errors.customerOtp}</Text>}
        </View>
        <Select name="gender" label="Gender" options={['Female', 'Male', 'Other']} />
        {renderField('location', 'Location')}
      </>
    );
    if (step === 1) return (
      <>
        <Text style={styles.subtle}>Capture the rider face photo and ID card with the device camera.</Text>
        <ScanField name="passport" label="Passport / rider face photo" hint="Open camera for the rider face photo" />
        <ScanField name="idFront" label="National ID front" hint="Open camera for the front of the ID card" />
        <ScanField name="idBack" label="National ID back" hint="Open camera for the back of the ID card" />
        <ScanField name="idScan" label="ID card scan for OCR" hint="Open camera for OCR-ready ID capture" />
        {!!cameraError && <Text style={styles.error}>{cameraError}</Text>}
        {!!cameraTarget && (
          <View style={styles.cameraPanel}>
            <Text style={styles.label}>Camera: {cameraTarget.label}</Text>
            {React.createElement('video', {
              ref: videoRef,
              autoPlay: true,
              playsInline: true,
              muted: true,
              controls: false,
              style: styles.cameraPreview,
            })}
            <View style={styles.uploadActions}>
              <TouchableOpacity style={styles.uploadActionButton} onPress={snapDocumentPhoto}>
                <Text style={styles.uploadActionText}>📷 Snap Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.uploadActionButtonAlt} onPress={closeCamera}>
                <Text style={styles.uploadActionTextAlt}>📷 Close Camera</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        <View style={styles.scanPanel}>
          <Text style={styles.label}>ID scan result</Text>
          <TextInput
            style={[styles.input, styles.scanTextArea]}
            value={form.idScanText}
            onChangeText={(value) => update('idScanText', value)}
            multiline
            placeholder="Scanned name and National ID will appear here"
            placeholderTextColor={theme === 'dark' ? '#7f93a8' : '#8a97a8'}
          />
        </View>
      </>
    );
    if (step === 2) return (
      <>
        {renderField('kinName', 'Next-of-kin full name')}
        {renderField('kinPhone', 'Next-of-kin phone', 'phone-pad')}
        <Select name="relationship" label="Relationship" options={['Spouse', 'Parent', 'Sibling', 'Friend', 'Guardian']} />
        <View style={styles.otpPanel}>
          <Text style={styles.label}>Next-of-kin consent OTP</Text>
          <Text style={styles.subtle}>Send an OTP to the next-of-kin phone, then record whether they approve.</Text>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => {
              setKinOtpSent(true);
              setKinOtp('');
              setKinConsent('');
              setErrors((current) => ({ ...current, kinOtp: '', kinConsent: '' }));
            }}
          >
            <Text style={styles.secondaryText}>{kinOtpSent ? 'Resend OTP' : 'Send OTP'}</Text>
          </TouchableOpacity>
          {kinOtpSent && (
            <>
              <TextInput
                style={styles.input}
                value={kinOtp}
                onChangeText={setKinOtp}
                keyboardType="number-pad"
                maxLength={6}
                placeholder="Enter OTP"
                placeholderTextColor={theme === 'dark' ? '#7f93a8' : '#8a97a8'}
              />
              <View style={styles.consentActions}>
                <TouchableOpacity style={[styles.consentButton, kinConsent === 'yes' && styles.consentButtonActive]} onPress={() => setKinConsent('yes')}>
                  <Text style={[styles.consentText, kinConsent === 'yes' && styles.consentTextActive]}>Yes</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.consentButton, kinConsent === 'no' && styles.consentButtonDanger]} onPress={() => setKinConsent('no')}>
                  <Text style={[styles.consentText, kinConsent === 'no' && styles.consentTextActive]}>No</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
          {!!errors.kinOtp && <Text style={styles.error}>{errors.kinOtp}</Text>}
          {!!errors.kinConsent && <Text style={styles.error}>{errors.kinConsent}</Text>}
        </View>
      </>
    );
    if (step === 3) return (
      <>
        <Select name="bikeModel" label="Bike model" options={['Boxer 150', 'TVS Star']} />
        {renderField('chassis', 'Chassis number')}
        {renderField('deposit', 'Deposit amount')}
        <Select name="installment" label="Installment plan" options={['Daily KES 300', 'Weekly KES 2,000']} />
      </>
    );
    return (
      <View style={styles.review}>
        <Text style={styles.reviewItem}>Rider phone OTP: Verified</Text>
        <Text style={styles.reviewItem}>Next-of-kin OTP: Verified</Text>
        {['fullName', 'nationalId', 'phone', 'passport', 'idFront', 'idBack', 'idScan', 'kinName', 'kinPhone', 'relationship', 'bikeModel', 'chassis', 'deposit', 'installment'].map((key) => (
          <Text key={key} style={styles.reviewItem}>{key.replace(/([A-Z])/g, ' $1')}: {form[key] || '-'}</Text>
        ))}
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Register Rider</Text>
      {!!lastSavedAt && <Text style={styles.subtle}>Draft autosaved at {lastSavedAt}</Text>}
      <View style={styles.card}>{renderStep()}</View>
      <View style={styles.actions}>
        {step > 0 && <TouchableOpacity style={styles.secondaryButton} onPress={() => setStep(step - 1)}><Text style={styles.secondaryText}>Back</Text></TouchableOpacity>}
        {step < steps.length - 1
          ? <TouchableOpacity style={styles.primaryButton} onPress={nextStep}><Text style={styles.primaryText}>Continue</Text></TouchableOpacity>
          : <TouchableOpacity style={styles.primaryButton} onPress={submit}><Text style={styles.primaryText}>Submit Application</Text></TouchableOpacity>}
      </View>
    </ScrollView>
  );
}

const createStyles = (theme) => {
  const dark = theme === 'dark';
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: '#ffffff' },
    content: { padding: 16, paddingBottom: 48 },
    title: { fontSize: 24, fontWeight: '800', color: dark ? '#f3f6fb' : '#0b1730', fontFamily: 'Georgia', marginBottom: 8 },
    subtle: { color: dark ? '#b8c3d7' : '#627083', fontSize: 13, lineHeight: 19, fontFamily: 'Georgia' },
    steps: { gap: 8, paddingVertical: 14, flexDirection: 'column', alignItems: 'stretch' },
    step: { paddingVertical: 12, paddingHorizontal: 12, borderRadius: 10, backgroundColor: dark ? '#092a75' : '#f5f8ff', borderWidth: 1, borderColor: dark ? '#29384a' : '#e6eef3' },
    stepActive: { backgroundColor: '#0f5fff', borderColor: '#0f5fff' },
    stepText: { color: dark ? '#f3f6fb' : '#0b1730', fontSize: 12, fontWeight: '700', fontFamily: 'Georgia' },
    stepTextActive: { color: '#ffffff' },
    card: { backgroundColor: dark ? '#092a75' : '#f5f8ff', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: dark ? '#183054' : '#e7eef4' },
    field: { marginBottom: 14 },
    label: { color: dark ? '#f3f6fb' : '#0b1730', fontWeight: '700', marginBottom: 6, fontFamily: 'Georgia' },
    input: { borderWidth: 1, borderColor: dark ? '#334155' : '#dce3ea', borderRadius: 10, padding: 12, color: dark ? '#f8fafc' : '#0f1720', backgroundColor: dark ? '#030814' : '#f8fafc', fontFamily: 'Georgia' },
    uploadBox: { borderWidth: 1, borderStyle: 'dashed', borderColor: dark ? '#29406a' : '#b7c9e8', borderRadius: 12, backgroundColor: dark ? '#07101f' : '#f5f8ff', padding: 14, gap: 5 },
    uploadTitle: { color: dark ? '#f3f6fb' : '#0b1730', fontSize: 14, fontWeight: '900', fontFamily: 'Georgia' },
    uploadHint: { color: dark ? '#b8c3d7' : '#627083', fontSize: 12, lineHeight: 17, fontFamily: 'Georgia' },
    uploadActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
    uploadActionButton: { backgroundColor: '#0f5fff', borderRadius: 9, paddingVertical: 9, paddingHorizontal: 12 },
    uploadActionButtonAlt: { backgroundColor: dark ? '#223044' : '#edf3ff', borderRadius: 9, paddingVertical: 9, paddingHorizontal: 12, borderWidth: 1, borderColor: dark ? '#334155' : '#dce3ea' },
    uploadActionText: { color: '#ffffff', fontSize: 12, fontWeight: '900', fontFamily: 'Georgia' },
    uploadActionTextAlt: { color: dark ? '#f3f6fb' : '#0f5fff', fontSize: 12, fontWeight: '900', fontFamily: 'Georgia' },
    uploadPreview: { width: '100%', height: 170, borderRadius: 12, marginTop: 10, borderWidth: 1, borderColor: dark ? '#29406a' : '#dce3ea', objectFit: 'cover' },
    cameraPanel: { borderWidth: 1, borderColor: dark ? '#29406a' : '#b7c9e8', borderRadius: 12, backgroundColor: dark ? '#07101f' : '#f5f8ff', padding: 12, gap: 10, marginBottom: 14 },
    cameraPreview: { width: '100%', maxHeight: 280, borderRadius: 10, backgroundColor: '#000000' },
    scanPanel: { borderWidth: 1, borderColor: dark ? '#183054' : '#e7eef4', borderRadius: 12, backgroundColor: dark ? '#030814' : '#f8fafc', padding: 12, marginTop: 4, gap: 10 },
    scanTextArea: { minHeight: 96, textAlignVertical: 'top' },
    otpPanel: { borderWidth: 1, borderColor: dark ? '#183054' : '#e7eef4', borderRadius: 12, backgroundColor: dark ? '#030814' : '#f8fafc', padding: 12, gap: 10, marginTop: 4 },
    otpHint: { color: '#0f5fff', fontSize: 12, fontWeight: '900', fontFamily: 'Georgia' },
    consentActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    consentButton: { minWidth: 82, borderRadius: 9, borderWidth: 1, borderColor: dark ? '#334155' : '#dce3ea', backgroundColor: dark ? '#07101f' : '#ffffff', paddingVertical: 10, paddingHorizontal: 12, alignItems: 'center' },
    consentButtonActive: { backgroundColor: '#23863a', borderColor: '#23863a' },
    consentButtonDanger: { backgroundColor: '#bd2a2a', borderColor: '#bd2a2a' },
    consentText: { color: dark ? '#f3f6fb' : '#0b1730', fontSize: 13, fontWeight: '900', fontFamily: 'Georgia' },
    consentTextActive: { color: '#ffffff' },
    datePickButton: { flexDirection: 'row', gap: 8, alignSelf: 'flex-start', borderWidth: 1, borderColor: dark ? '#334155' : '#dce3ea', borderRadius: 12, backgroundColor: dark ? '#030814' : '#f8fafc', padding: 8 },
    datePart: { minWidth: 76, borderRadius: 9, backgroundColor: dark ? '#07101f' : '#ffffff', borderWidth: 1, borderColor: dark ? '#183054' : '#e7eef4', paddingVertical: 8, paddingHorizontal: 10 },
    datePartLabel: { color: '#0f5fff', fontSize: 10, fontWeight: '900', fontFamily: 'Georgia', textTransform: 'uppercase', marginBottom: 3 },
    datePartValue: { color: dark ? '#f8fafc' : '#0f1720', fontSize: 14, fontWeight: '900', fontFamily: 'Georgia' },
    calendarBox: { marginTop: 10, borderWidth: 1, borderColor: dark ? '#334155' : '#dce3ea', borderRadius: 12, backgroundColor: dark ? '#030814' : '#f8fafc', padding: 10 },
    calendarHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
    calendarNavButton: { width: 34, height: 34, borderRadius: 9, backgroundColor: dark ? '#223044' : '#edf3ff', alignItems: 'center', justifyContent: 'center' },
    calendarNavText: { color: '#0f5fff', fontSize: 14, fontWeight: '900', fontFamily: 'Georgia' },
    calendarTitle: { color: dark ? '#f3f6fb' : '#0b1730', fontSize: 14, fontWeight: '900', fontFamily: 'Georgia', minWidth: 42 },
    yearInput: { width: 78, height: 34, borderWidth: 1, borderColor: dark ? '#334155' : '#dce3ea', borderRadius: 9, paddingHorizontal: 10, color: dark ? '#f8fafc' : '#0f1720', backgroundColor: dark ? '#07101f' : '#ffffff', fontFamily: 'Georgia', fontWeight: '800' },
    calendarGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    calendarDay: { width: 36, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: dark ? '#07101f' : '#ffffff', borderWidth: 1, borderColor: dark ? '#183054' : '#e7eef4' },
    calendarDayActive: { backgroundColor: '#0f5fff', borderColor: '#0f5fff' },
    calendarDayText: { color: dark ? '#f3f6fb' : '#0b1730', fontSize: 12, fontWeight: '800', fontFamily: 'Georgia' },
    calendarDayTextActive: { color: '#ffffff' },
    segmented: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    segment: { paddingVertical: 9, paddingHorizontal: 12, borderRadius: 999, backgroundColor: dark ? '#030814' : '#f3f6f8' },
    segmentActive: { backgroundColor: '#0f5fff' },
    segmentText: { color: dark ? '#f3f6fb' : '#0b1730', fontFamily: 'Georgia', fontWeight: '700' },
    segmentTextActive: { color: '#ffffff' },
    alert: { borderWidth: 1, borderColor: '#f3b949', backgroundColor: dark ? '#2a2112' : '#fff8e6', borderRadius: 12, padding: 14, marginBottom: 14 },
    alertTitle: { color: dark ? '#ffe7a3' : '#7a4a00', fontWeight: '800', marginBottom: 5, fontFamily: 'Georgia' },
    blockText: { color: '#b42318', fontSize: 13, lineHeight: 19, fontWeight: '900', fontFamily: 'Georgia', marginBottom: 8 },
    allowText: { color: '#0f5fff', fontSize: 13, lineHeight: 19, fontWeight: '900', fontFamily: 'Georgia', marginBottom: 8 },
    error: { color: '#b42318', fontSize: 12, marginTop: 5, fontFamily: 'Georgia' },
    actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 },
    primaryButton: { backgroundColor: '#0f5fff', borderRadius: 10, paddingVertical: 12, paddingHorizontal: 16 },
    primaryText: { color: '#ffffff', fontWeight: '800', fontFamily: 'Georgia' },
    secondaryButton: { backgroundColor: dark ? '#223044' : '#edf3ff', borderRadius: 10, paddingVertical: 12, paddingHorizontal: 16 },
    secondaryText: { color: dark ? '#f3f6fb' : '#0f5fff', fontWeight: '800', fontFamily: 'Georgia' },
    review: { gap: 8 },
    reviewItem: { color: dark ? '#f3f6fb' : '#0b1730', fontFamily: 'Georgia', textTransform: 'capitalize' },
  });
};
