import React, { useMemo, useState, useEffect, useRef } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet, ScrollView, Image } from 'react-native';
import '../../../features/customers/customers.css';

const filters = ['All', 'Active', 'Pending', 'Info Required', 'Overdue'];
const detailTabs = ['Repairs', 'History'];
const checklistItems = [
  ['idSeen', 'ID seen'],
  ['bikeSeen', 'Bike seen'],
  ['chassisConfirmed', 'Chassis confirmed'],
  ['phoneConfirmed', 'Phone confirmed'],
  ['kinReachable', 'Next-of-kin reachable'],
  ['paymentPromiseRecorded', 'Payment promise recorded'],
];
const excuseOptions = ['No money today', 'Phone off', 'Bike broken', 'Out of town', 'Refused to pay', 'Paid but not confirmed'];

const bikePrice = (model) => ({ 'Boxer 150': 180000, 'TVS Star': 150000, 'Cruiser 200': 220000 }[model] || 160000);
const formatKes = (amount) => `KES ${Number(amount || 0).toLocaleString('en-KE')}`;
const dateInputValue = (year, month, day) => {
  const mm = String(month + 1).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
};
const extractLikelyId = (text) => {
  const matches = String(text || '').match(/\b\d{7,8}\b/g);
  return matches?.[0] || '';
};
const cleanPhone = (value) => String(value || '').replace(/[\s-]/g, '');

const parseKesNumber = (value) => {
  if (!value && value !== 0) return 0;
  if (typeof value === 'number') return value;
  const raw = String(value).replace(/[^0-9.]/g, '');
  return raw ? Number(raw) : 0;
};

const paymentSummary = (customer) => {
  const total = customer.totalPrice || bikePrice(customer.bike);
  const explicitPaid = Number(customer.paid || 0);
  const percent = explicitPaid > 0
    ? Math.round((explicitPaid / total) * 100)
    : Math.max(0, Math.min(100, Number(customer.progress) || 0));
  const paid = explicitPaid > 0 ? explicitPaid : Math.round((total * percent) / 100);
  const remaining = Math.max(0, customer.remaining ?? total - paid);
  return { total, paid, remaining, percent: Math.max(0, Math.min(100, percent)) };
};

const riskInfo = (customer) => {
  const score = customer.riskScore ?? customer.risk ?? Math.max(0, Math.min(100, 65 - Number(customer.progress || 0) + (customer.status === 'Info Required' ? 20 : 0)));
  if (score >= 70) return { score, label: 'High review priority', tone: 'riskHigh' };
  if (score >= 40) return { score, label: 'Medium review priority', tone: 'riskMedium' };
  return { score, label: 'Low review priority', tone: 'riskLow' };
};

export default function Customers({ theme, simpleMode = false, commandRiderId = null, selectedAction = '', customers = [], agent = {}, privacyMode = false, onExportCsv, onAddPayment, onCreateTask = () => {}, onSendMessage = () => {}, onAgentRecord = () => {}, onChecklistChange = () => {} }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [detailTab, setDetailTab] = useState('Repairs');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [paymentMpesaCode, setPaymentMpesaCode] = useState('');
  const [paymentPayerPhone, setPaymentPayerPhone] = useState('');
  const [paymentProofFile, setPaymentProofFile] = useState('');
  const [paymentError, setPaymentError] = useState('');
  const [messageText, setMessageText] = useState('');
  const [messageStatus, setMessageStatus] = useState('');
  const [visitNote, setVisitNote] = useState('');
  const [promiseAmount, setPromiseAmount] = useState('');
  const [promiseDate, setPromiseDate] = useState('');
  const [promiseNote, setPromiseNote] = useState('');
  const [chassisCheck, setChassisCheck] = useState('');
  const [evidenceName, setEvidenceName] = useState('');
  const [evidenceNote, setEvidenceNote] = useState('');
  const [scanIdNumber, setScanIdNumber] = useState('');
  const [scanFileName, setScanFileName] = useState('');
  const [scanImageUri, setScanImageUri] = useState('');
  const [scanOcrText, setScanOcrText] = useState('');
  const [scanStatus, setScanStatus] = useState('');
  const [repairCost, setRepairCost] = useState('');
  const [repairDamage, setRepairDamage] = useState('');
  const [repairEvidence, setRepairEvidence] = useState('');
  const [repairEvidencePreview, setRepairEvidencePreview] = useState('');
  const [repairCamera, setRepairCamera] = useState(null);
  const [repairEvidenceError, setRepairEvidenceError] = useState('');
  const [transferNote, setTransferNote] = useState('');
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [selectedCalendarDay, setSelectedCalendarDay] = useState(null);
  const [detailDateSearch, setDetailDateSearch] = useState('');
  const [portfolioCalendarMonth, setPortfolioCalendarMonth] = useState(new Date().getMonth());
  const [portfolioCalendarYear, setPortfolioCalendarYear] = useState(new Date().getFullYear());
  const [portfolioCalendarDay, setPortfolioCalendarDay] = useState(new Date().getDate());
  const [portfolioDateSearch, setPortfolioDateSearch] = useState(dateInputValue(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()));
  const [paymentView, setPaymentView] = useState('Day');
  const [portfolioBucket, setPortfolioBucket] = useState('All');
  const repairVideoRef = useRef(null);
  const styles = useMemo(() => createStyles(theme), [theme]);

  useEffect(() => {
    // keep selectedCustomer fresh if customers list updates externally
    if (!selectedCustomer) return;
    const updated = customers.find((customer) => customer.id === selectedCustomer.id);
    if (updated) setSelectedCustomer(updated);
  }, [customers, selectedCustomer]);

  const maskName = (value) => {
    if (!privacyMode) return value;
    const parts = String(value || '').split(' ');
    return `${parts[0] || 'Rider'} ${parts[1] ? `${parts[1][0]}.` : ''}`;
  };
  const maskPhone = (value) => privacyMode ? `${String(value || '').slice(0, 4)} *** ${String(value || '').slice(-3)}` : value;
  const maskId = (value) => privacyMode ? `****${String(value || '').slice(-3)}` : value;
  const agentCustomers = useMemo(() => {
    const code = agent.agentCode;
    if (!code) return [];
    return customers.filter((customer) => (
      customer.assignedAgentCode === code
      || customer.registeredByAgentCode === code
      || customer.agentCode === code
    ));
  }, [agent.agentCode, customers]);

  const filteredCustomers = useMemo(
    () =>
      agentCustomers.filter((customer) => {
        const statusMatch = filter === 'All'
          || (filter === 'Overdue' ? customer.overdue : customer.status === filter);
        const searchTerm = `${customer.name} ${customer.phone} ${customer.nationalId || ''} ${customer.cardId || ''} ${customer.riderPersonId || ''} ${customer.contractId || ''}`.toLowerCase();
        return statusMatch && searchTerm.includes(search.toLowerCase());
      }),
    [agentCustomers, filter, search]
  );

  useEffect(() => {
    if (!selectedCustomer) return;
    const baseDate = selectedCustomer.dueDate ? new Date(selectedCustomer.dueDate) : new Date();
    setCalendarMonth(baseDate.getMonth());
    setCalendarYear(baseDate.getFullYear());
    setSelectedCalendarDay(baseDate.getDate());
    setDetailDateSearch(dateInputValue(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate()));
  }, [selectedCustomer]);

  useEffect(() => {
    if (!selectedCustomer || !selectedAction) return;
    const actionTab = {
      'Open rider summary': 'Repairs',
      'Collect payment': 'Repairs',
      'Work payment calendar': 'Repairs',
      'Verify evidence': 'Repairs',
      'Track contracts and repairs': 'Repairs',
    };
    if (actionTab[selectedAction]) setDetailTab(actionTab[selectedAction]);
  }, [selectedAction, selectedCustomer]);

  useEffect(() => {
    if (!commandRiderId) return;
    const rider = agentCustomers.find((customer) => customer.id === commandRiderId);
    if (rider) {
      setSelectedCustomer(rider);
      setDetailTab('Repairs');
    }
  }, [agentCustomers, commandRiderId]);

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();

  const calendarEvents = useMemo(() => {
    if (!selectedCustomer) return {};
    const events = {};
    const addEvent = (day, event) => {
      if (!events[day]) events[day] = [];
      events[day].push(event);
    };

    const days = daysInMonth(calendarYear, calendarMonth);
    const installmentAmount = parseKesNumber(selectedCustomer.installment);
    if (installmentAmount > 0) {
      if (/Daily/i.test(selectedCustomer.installment)) {
        for (let day = 1; day <= days; day += 1) {
          addEvent(day, { type: 'expected', label: `Expected Daily KES ${installmentAmount.toLocaleString()}` });
        }
      } else if (/Weekly/i.test(selectedCustomer.installment)) {
        for (let day = 1; day <= days; day += 7) {
          addEvent(day, { type: 'expected', label: `Expected Weekly KES ${installmentAmount.toLocaleString()}` });
        }
      } else {
        addEvent(1, { type: 'expected', label: `Installment plan KES ${installmentAmount.toLocaleString()}` });
      }
    }

    const dueDate = selectedCustomer.dueDate ? new Date(selectedCustomer.dueDate) : null;
    if (dueDate && dueDate.getFullYear() === calendarYear && dueDate.getMonth() === calendarMonth) {
      addEvent(dueDate.getDate(), { type: 'due', label: `Contract due date (${formatKes(selectedCustomer.remaining)})` });
    }

    (selectedCustomer.transactions || []).forEach((transaction) => {
      const txDate = new Date(transaction.date);
      if (txDate.getFullYear() === calendarYear && txDate.getMonth() === calendarMonth) {
        addEvent(txDate.getDate(), { type: 'payment', label: `Paid KES ${Number(transaction.amount).toLocaleString()}` });
      }
    });

    return events;
  }, [selectedCustomer, calendarMonth, calendarYear]);

  const calendarDays = useMemo(() => {
    const days = daysInMonth(calendarYear, calendarMonth);
    return Array.from({ length: days }, (_, index) => {
      const day = index + 1;
      const events = calendarEvents[day] || [];
      return { day, events, isSelected: selectedCalendarDay === day };
    });
  }, [calendarEvents, calendarMonth, calendarYear, selectedCalendarDay]);

  const selectedDayEvents = selectedCalendarDay ? (calendarEvents[selectedCalendarDay] || []) : [];

  const dateKey = (date) => date.toISOString().slice(0, 10);
  const portfolioDate = new Date(portfolioCalendarYear, portfolioCalendarMonth, portfolioCalendarDay);
  const sameDay = (a, b) => dateKey(a) === dateKey(b);
  const isSameWeek = (date, base) => {
    const start = new Date(base);
    start.setDate(base.getDate() - base.getDay());
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    return date >= start && date < end;
  };
  const portfolioPaymentRows = useMemo(() => {
    const rows = [];
    agentCustomers.forEach((customer) => {
      const installmentAmount = parseKesNumber(customer.installment);
      const remaining = Number(customer.remaining || 0);
      const dueDate = customer.dueDate ? new Date(customer.dueDate) : null;
      const expectedByPlan = installmentAmount > 0 && remaining > 0
        && ((paymentView === 'Day' && (/Daily/i.test(customer.installment) || (dueDate && sameDay(dueDate, portfolioDate))))
          || (paymentView === 'Week' && (/Weekly/i.test(customer.installment) || (dueDate && isSameWeek(dueDate, portfolioDate))))
          || (paymentView === 'Month' && (dueDate ? dueDate.getFullYear() === portfolioCalendarYear && dueDate.getMonth() === portfolioCalendarMonth : true)));

      if (expectedByPlan) {
        rows.push({
          id: `${customer.id}-expected`,
          customerId: customer.id,
          rider: customer.name,
          cardId: customer.cardId,
          agentCode: customer.assignedAgentCode || customer.agentCode || agent.agentCode,
          type: 'Expected collection',
          amount: installmentAmount,
          status: remaining > 0 ? 'Collect / follow up' : 'Cleared',
          bucket: dueDate && dueDate < portfolioDate ? 'Overdue' : 'Debt Due',
          detail: `${customer.installment || 'Payment plan'} - remaining ${formatKes(remaining)}`,
        });
      }

      (customer.transactions || []).forEach((tx) => {
        const txDate = new Date(tx.date);
        const include = paymentView === 'Day'
          ? sameDay(txDate, portfolioDate)
          : paymentView === 'Week'
            ? isSameWeek(txDate, portfolioDate)
            : txDate.getFullYear() === portfolioCalendarYear && txDate.getMonth() === portfolioCalendarMonth;
        if (include) {
          rows.push({
            id: `${customer.id}-${tx.id}`,
            customerId: customer.id,
            rider: customer.name,
            cardId: customer.cardId,
            agentCode: customer.assignedAgentCode || customer.agentCode || agent.agentCode,
            type: tx.type || 'Payment',
            amount: Number(tx.amount || 0),
            status: 'Recorded',
            bucket: 'Paid',
            detail: `${tx.date} - ${tx.note || 'Payment received'}`,
          });
        }
      });

      if (paymentView === 'Day' && (customer.status === 'Pending' || customer.status === 'Info Required')) {
        const createdDate = customer.createdAt ? new Date(customer.createdAt) : null;
        const includePending = createdDate && sameDay(createdDate, portfolioDate);
        if (includePending) {
          rows.push({
            id: `${customer.id}-pending`,
            customerId: customer.id,
            rider: customer.name,
            cardId: customer.cardId,
            agentCode: customer.assignedAgentCode || customer.agentCode || agent.agentCode,
            type: 'Pending application',
            amount: Number(customer.remaining || 0),
            status: customer.status,
            bucket: 'Pending',
            detail: `Application needs action - ${customer.status}`,
          });
        }
      }
    });
    return rows;
  }, [agent.agentCode, agentCustomers, paymentView, portfolioCalendarDay, portfolioCalendarMonth, portfolioCalendarYear]);

  const portfolioBuckets = useMemo(() => {
    const bucketNames = ['All', 'Paid', 'Debt Due', 'Overdue', 'Pending'];
    return bucketNames.map((name) => {
      const rows = name === 'All' ? portfolioPaymentRows : portfolioPaymentRows.filter((row) => row.bucket === name);
      const total = rows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
      return { name, count: rows.length, total };
    });
  }, [portfolioPaymentRows]);

  const visiblePortfolioRows = useMemo(() => (
    portfolioBucket === 'All'
      ? portfolioPaymentRows
      : portfolioPaymentRows.filter((row) => row.bucket === portfolioBucket)
  ), [portfolioBucket, portfolioPaymentRows]);

  const portfolioCalendarDays = useMemo(() => {
    const days = daysInMonth(portfolioCalendarYear, portfolioCalendarMonth);
    return Array.from({ length: days }, (_, index) => {
      const day = index + 1;
      const date = new Date(portfolioCalendarYear, portfolioCalendarMonth, day);
      const hasTransactions = agentCustomers.some((customer) => (customer.transactions || []).some((tx) => sameDay(new Date(tx.date), date)));
      const hasDue = agentCustomers.some((customer) => customer.dueDate && sameDay(new Date(customer.dueDate), date));
      return { day, hasTransactions, hasDue, isSelected: portfolioCalendarDay === day };
    });
  }, [agentCustomers, portfolioCalendarDay, portfolioCalendarMonth, portfolioCalendarYear]);

  const moveCalendar = (offset) => {
    const next = new Date(calendarYear, calendarMonth + offset, 1);
    setCalendarMonth(next.getMonth());
    setCalendarYear(next.getFullYear());
    setSelectedCalendarDay(1);
    setDetailDateSearch(dateInputValue(next.getFullYear(), next.getMonth(), 1));
  };

  const movePortfolioCalendar = (offset) => {
    const next = new Date(portfolioCalendarYear, portfolioCalendarMonth + offset, 1);
    setPortfolioCalendarMonth(next.getMonth());
    setPortfolioCalendarYear(next.getFullYear());
    setPortfolioCalendarDay(1);
    setPortfolioDateSearch(dateInputValue(next.getFullYear(), next.getMonth(), 1));
    setPortfolioBucket('All');
  };

  const applyDetailDateSearch = (value) => {
    setDetailDateSearch(value);
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) return;
    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    const day = Number(match[3]);
    if (month < 0 || month > 11 || day < 1 || day > daysInMonth(year, month)) return;
    setCalendarYear(year);
    setCalendarMonth(month);
    setSelectedCalendarDay(day);
  };

  const applyPortfolioDateSearch = (value) => {
    setPortfolioDateSearch(value);
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) return;
    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    const day = Number(match[3]);
    if (month < 0 || month > 11 || day < 1 || day > daysInMonth(year, month)) return;
    setPortfolioCalendarYear(year);
    setPortfolioCalendarMonth(month);
    setPortfolioCalendarDay(day);
    setPortfolioBucket('All');
  };

  const useTodayForPortfolio = () => {
    const today = new Date();
    const value = dateInputValue(today.getFullYear(), today.getMonth(), today.getDate());
    applyPortfolioDateSearch(value);
  };

  const addVisitProof = (customer) => {
    onAgentRecord(customer.id, 'visit', {
      title: 'Field visit confirmed',
      detail: visitNote || `Agent ${agent.agentCode || 'Unassigned'} confirmed field visit.`,
      note: visitNote,
    });
    setVisitNote('');
  };

  const addPromise = (customer) => {
    if (!promiseAmount || !promiseDate) return;
    onAgentRecord(customer.id, 'promise', {
      title: 'Promise to pay recorded',
      amount: promiseAmount,
      promiseDate,
      detail: `${promiseAmount} promised for ${promiseDate}${promiseNote ? ` - ${promiseNote}` : ''}`,
      note: promiseNote,
    });
    onChecklistChange(customer.id, 'paymentPromiseRecorded', true);
    setPromiseAmount('');
    setPromiseDate('');
    setPromiseNote('');
  };

  const checkChassis = (customer) => {
    const expected = String(customer.chassis || '').trim().toUpperCase();
    const typed = String(chassisCheck || '').trim().toUpperCase();
    if (!typed) return;
    const matched = expected && typed === expected;
    onAgentRecord(customer.id, 'chassis-check', {
      title: matched ? 'Chassis matched' : 'Chassis mismatch warning',
      result: matched ? 'Match' : 'Mismatch',
      detail: matched ? `Typed ${typed} matched registered bike.` : `Typed ${typed}; expected ${expected || 'no chassis on file'}.`,
    });
    if (matched) onChecklistChange(customer.id, 'chassisConfirmed', true);
    setChassisCheck('');
  };

  const addEvidence = (customer) => {
    if (!evidenceName.trim() && !evidenceNote.trim()) return;
    onAgentRecord(customer.id, 'evidence', {
      title: 'Evidence captured by agent',
      fileName: evidenceName || 'Camera/upload evidence placeholder',
      detail: `${evidenceName || 'Capture needed'}${evidenceNote ? ` - ${evidenceNote}` : ''}`,
      note: evidenceNote,
    });
    setEvidenceName('');
    setEvidenceNote('');
  };

  const pickIdCardImage = () => {
    if (typeof document === 'undefined') {
      setScanStatus('Image capture is only available in the browser app.');
      return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.setAttribute('capture', 'environment');
    input.onchange = async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      setScanFileName(file.name);
      setScanStatus('Reading ID card image...');
      const reader = new FileReader();
      reader.onload = async () => {
        const imageUri = String(reader.result || '');
        setScanImageUri(imageUri);
        try {
          const Tesseract = await import('tesseract.js');
          const result = await Tesseract.recognize(imageUri, 'eng');
          const text = result?.data?.text || '';
          const foundId = extractLikelyId(text);
          setScanOcrText(text.trim());
          if (foundId) setScanIdNumber(foundId);
          setScanStatus(foundId ? `OCR found possible ID: ${foundId}` : 'OCR finished. Type the ID if it was not clear.');
        } catch (error) {
          setScanStatus('Image saved, but OCR could not read it. Type the ID manually.');
        }
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const scanIdCard = (customer) => {
    if (!scanIdNumber.trim() && !scanFileName.trim()) return;
    const expected = String(customer.nationalId || '').trim();
    const scanned = String(scanIdNumber || '').trim();
    const matched = expected && scanned === expected;
    onAgentRecord(customer.id, 'id-scan', {
      title: matched ? 'ID scan matched rider' : 'ID scan needs review',
      result: matched ? 'Match' : 'Review',
      fileName: scanFileName,
      imageCaptured: !!scanImageUri,
      ocrText: scanOcrText,
      detail: matched ? `Scanned ID ${scanned} matched customer record.` : `Scanned/typed ID ${scanned || 'missing'}; expected ${expected || 'no ID on file'}.`,
    });
    if (matched) onChecklistChange(customer.id, 'idSeen', true);
    setScanIdNumber('');
    setScanFileName('');
    setScanImageUri('');
    setScanOcrText('');
    setScanStatus('');
  };

  const addExcuse = (customer, excuse) => {
    const repeatCount = (customer.excuseLogs || []).filter((item) => item.excuse === excuse).length + 1;
    onAgentRecord(customer.id, 'excuse', {
      title: repeatCount > 1 ? 'Repeated customer excuse' : 'Customer excuse recorded',
      excuse,
      detail: `${excuse}${repeatCount > 1 ? ` repeated ${repeatCount} times` : ''}`,
    });
  };

  const addRepairDebtRequest = (customer) => {
    const cost = parseKesNumber(repairCost);
    if (!cost || !repairDamage.trim()) return;
    onAgentRecord(customer.id, 'repair-debt', {
      title: 'Repair debt request captured',
      amount: cost,
      damage: repairDamage,
      fileName: repairEvidence,
      evidencePreview: repairEvidencePreview,
      status: 'Pending approval',
      detail: `Pending repair debt ${formatKes(cost)} for ${repairDamage}${repairEvidence ? ` - evidence ${repairEvidence}` : ''}`,
    });
    setRepairCost('');
    setRepairDamage('');
    setRepairEvidence('');
    setRepairEvidencePreview('');
  };

  const pickRepairEvidenceUpload = () => {
    setRepairEvidenceError('');
    if (typeof document === 'undefined') {
      setRepairEvidenceError('Upload is only available in the browser app.');
      return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      setRepairEvidence(file.name);
      const reader = new FileReader();
      reader.onload = () => setRepairEvidencePreview(String(reader.result || ''));
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const openRepairEvidenceCaptureFallback = () => {
    setRepairEvidenceError('');
    if (typeof document === 'undefined') {
      setRepairEvidenceError('Camera is not available on this device.');
      return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.setAttribute('capture', 'environment');
    input.style.position = 'fixed';
    input.style.left = '-9999px';
    document.body.appendChild(input);
    const cleanup = () => input.remove();
    input.onchange = (event) => {
      const file = event.target.files?.[0];
      if (!file) {
        setRepairEvidenceError('No photo was selected.');
        cleanup();
        return;
      }
      setRepairEvidence(file.name || `Repair evidence ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
      const reader = new FileReader();
      reader.onload = () => {
        setRepairEvidencePreview(String(reader.result || ''));
        setRepairEvidenceError('');
        cleanup();
      };
      reader.readAsDataURL(file);
    };
    input.oncancel = cleanup;
    input.click();
  };

  const closeRepairCamera = () => {
    repairCamera?.stream?.getTracks?.().forEach((track) => track.stop());
    setRepairCamera(null);
  };

  useEffect(() => () => {
    repairCamera?.stream?.getTracks?.().forEach((track) => track.stop());
  }, [repairCamera]);

  const openRepairEvidenceCamera = async () => {
    setRepairEvidenceError('');
    if (!navigator?.mediaDevices?.getUserMedia) {
      setRepairEvidenceError('Live camera is not available in this browser. Use Upload Photo for existing images.');
      return;
    }
    try {
      closeRepairCamera();
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } } });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }
      setRepairCamera({ stream });
      setTimeout(() => {
        if (repairVideoRef.current) repairVideoRef.current.srcObject = stream;
      }, 0);
    } catch {
      setRepairEvidenceError('Live camera is blocked. Allow camera permission in the browser, then tap Snap Photo again.');
    }
  };

  const snapRepairEvidence = () => {
    const video = repairVideoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 720;
    canvas.height = video.videoHeight || 540;
    canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
    setRepairEvidence(`Repair evidence ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
    setRepairEvidencePreview(canvas.toDataURL('image/jpeg', 0.86));
    closeRepairCamera();
  };

  const createRiderTask = (customer, title, note) => {
    onCreateTask(customer.id, title, note);
    setMessageStatus(`Task created: ${title}`);
  };

  const requestTransfer = (customer) => {
    onAgentRecord(customer.id, 'transfer-request', {
      title: 'Rider transfer requested',
      status: 'Pending admin/finance approval',
      fromAgentCode: customer.assignedAgentCode || customer.agentCode || 'Unknown',
      toAgentCode: agent.agentCode || 'current agent',
      riderPersonId: customer.riderPersonId || '',
      contractId: customer.contractId || '',
      balance: paymentSummary(customer).remaining,
      detail: `Transfer requested to ${agent.agentCode || 'current agent'} without creating a new Rider Person ID. ${transferNote || 'No extra note.'}`,
      note: transferNote,
    });
    setTransferNote('');
  };

  const exportCsv = () => {
    const rows = [
      ['Rider Person ID', 'Contract ID', 'Card ID', 'Assigned Agent', 'Registered By Agent', 'Linked Previous Contract', 'Rider', 'Phone', 'National ID', 'Bike', 'Status', 'Total Price', 'Deposit', 'Paid Amount', 'Remaining Amount', 'Payment %', 'Last Payment'],
      ...filteredCustomers.map((customer) => {
        const payment = paymentSummary(customer);
        return [
          customer.riderPersonId || '',
          customer.contractId || '',
          customer.cardId,
          customer.assignedAgentCode || customer.agentCode || '',
          customer.registeredByAgentCode || '',
          customer.linkedPreviousContractId || '',
          customer.name,
          customer.phone,
          customer.nationalId || '',
          customer.bike,
          customer.status,
          formatKes(payment.total),
          customer.deposit || '',
          formatKes(payment.paid),
          formatKes(payment.remaining),
          `${payment.percent}%`,
          customer.lastPayment,
        ];
      }),
    ];
    onExportCsv('bumu-riders.csv', rows);
  };

  const riskyCustomers = agentCustomers.filter((customer) => customer.flagged || customer.overdue || Number(customer.risk || 0) >= 60);
  const followedRisky = riskyCustomers.filter((customer) => (
    (customer.riskNotes || []).length
    + (customer.visitLogs || []).length
    + (customer.promiseLogs || []).length
  ) > 0).length;
  const followupScore = riskyCustomers.length ? Math.round((followedRisky / riskyCustomers.length) * 100) : 100;
  const isPaymentsHub = selectedAction === 'Payments hub';
  const isPaymentCalendar = selectedAction === 'Work payment calendar';
  const isCollectPayment = selectedAction === 'Collect payment';
  const isVerification = selectedAction === 'Verify evidence';
  const isTransfer = selectedAction === 'Track contracts and repairs';
  const featureTitle = isPaymentsHub
    ? 'Payments'
    : isCollectPayment
    ? 'Collect Payment'
    : isPaymentCalendar
      ? 'Payment Calendar'
      : isVerification
        ? 'Verification'
        : isTransfer
          ? 'Transfer Rider'
          : 'Rider Portfolio';
  const featureHint = isPaymentsHub
    ? 'Collect payment, check dates, and open real rider payment records from one place.'
    : isCollectPayment
    ? 'Only riders with balances are shown. Choose one to record payment proof.'
    : isPaymentCalendar
      ? 'Click a date or bucket to see real paid, due, overdue, and pending rider records.'
      : isVerification
        ? 'Choose a rider to open ID, chassis, visit proof, promise, and evidence tools.'
        : isTransfer
          ? 'Choose a rider to review contracts, old records, repair debt, and transfer request tools.'
        : 'Search and open riders assigned to this agent.';
  const availableFilters = useMemo(() => {
    if (isVerification) return ['All', 'Pending', 'Info Required', 'Overdue'];
    if (isPaymentsHub || isCollectPayment) return ['All', 'Active', 'Pending', 'Info Required', 'Overdue'];
    if (isTransfer) return ['All', 'Active', 'Pending', 'Info Required', 'Overdue'];
    return filters;
  }, [isCollectPayment, isPaymentsHub, isTransfer, isVerification]);
  useEffect(() => {
    if (!availableFilters.includes(filter)) setFilter('All');
  }, [availableFilters, filter]);
  const actionCustomers = useMemo(() => {
    if (isPaymentsHub || isCollectPayment) return filteredCustomers.filter((customer) => Number(paymentSummary(customer).remaining || 0) > 0);
    if (isVerification) {
      return filteredCustomers.filter((customer) => {
        const checklist = customer.verificationChecklist || {};
        const missingEvidence = !checklist.idSeen
          || !checklist.chassisConfirmed
          || !checklist.passportPhoto
          || !checklist.idFront
          || !checklist.idBack
          || !checklist.idScan;
        return customer.status === 'Pending'
          || customer.status === 'Info Required'
          || customer.flagged
          || Number(customer.risk || 0) >= 60
          || missingEvidence;
      });
    }
    if (isTransfer) return filteredCustomers.filter((customer) => (
      customer.returningRider
      || customer.previousAgentCode
      || customer.linkedPreviousContractId
      || (customer.duplicateAttempts || []).length
      || (customer.repairDebtRequests || []).length
      || customer.contractStatus === 'Active'
      || Number(paymentSummary(customer).remaining || 0) > 0
    ));
    return filteredCustomers;
  }, [filteredCustomers, isCollectPayment, isPaymentsHub, isTransfer, isVerification]);

  if (selectedCustomer) {
    const customer = selectedCustomer;
    const payment = paymentSummary(customer);
    const risk = riskInfo(customer);
    const linkedContracts = customers.filter((item) => item.id !== customer.id && (
      (customer.riderPersonId && item.riderPersonId === customer.riderPersonId)
      || (customer.nationalId && item.nationalId === customer.nationalId)
      || (customer.phone && cleanPhone(item.phone) === cleanPhone(customer.phone))
      || item.contractId === customer.linkedPreviousContractId
      || item.linkedPreviousContractId === customer.contractId
      || item.cardId === customer.linkedRiderId
      || item.linkedRiderId === customer.cardId
    ));
    const pendingRepairDebt = (customer.repairDebtRequests || [])
      .filter((item) => item.status !== 'Approved' && item.status !== 'Rejected')
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const projectedBalance = payment.remaining + pendingRepairDebt;
    const idMatched = !!customer.verificationChecklist?.idSeen || (customer.idScanLogs || []).some((item) => item.result === 'Match' || item.result === 'match');
    const bikeVerified = !!customer.verificationChecklist?.chassisConfirmed || (customer.chassisChecks || []).some((item) => item.result === 'Match' || item.result === 'match');
    const openPromises = (customer.promiseLogs || []).filter((item) => item.status !== 'kept' && item.status !== 'cancelled').length;
    const brokenPromises = (customer.promiseLogs || []).filter((item) => item.status === 'broken').length;
    const promisesDueToday = (customer.promiseLogs || []).filter((item) => item.promiseDate === new Date().toISOString().slice(0, 10) || /today/i.test(item.detail || '')).length;
    const excuseCount = (customer.excuseLogs || []).length;
    const repairAmount = parseKesNumber(repairCost);
    const repairProjectedBalance = payment.remaining + pendingRepairDebt + repairAmount;
    const currentInstallment = parseKesNumber(customer.installment);
    const addedRepairDays = currentInstallment && repairAmount ? Math.ceil(repairAmount / currentInstallment) : 0;
    const riderPhoto = customer.documentFiles?.passportPreview;
    const smartTimeline = [
      { title: 'Registration created', detail: `${customer.cardId || 'Card pending'} under ${customer.registeredByAgentCode || customer.agentCode || agent.agentCode}`, time: customer.createdAt || 'Unknown date' },
      ...(customer.transactions || []).map((tx) => ({ title: `${tx.type || 'Payment'} recorded`, detail: `${formatKes(tx.amount)} - balance ${formatKes(tx.balanceAfter)}`, time: tx.date })),
      ...(customer.idScanLogs || []).map((item) => ({ title: 'ID scan check', detail: item.detail || item.result || 'ID captured', time: item.time || item.date || 'Recent' })),
      ...(customer.chassisChecks || []).map((item) => ({ title: 'Chassis check', detail: item.detail || item.result || 'Bike checked', time: item.time || item.date || 'Recent' })),
      ...(customer.promiseLogs || []).map((item) => ({ title: 'Promise to pay', detail: item.detail || `${item.amount || ''} ${item.promiseDate || ''}`, time: item.time || item.date || 'Recent' })),
      ...(customer.repairDebtRequests || []).map((item) => ({ title: 'Repair debt request', detail: item.detail || `${item.damage || 'Damage'} - ${formatKes(item.amount)}`, time: item.time || item.date || 'Recent' })),
      ...(customer.riskNotes || []).map((item) => ({ title: item.title, detail: item.detail, time: item.time || item.date || 'Recent' })),
    ].slice(0, 12);
    const nextAction = customer.overdue
      ? 'Collect payment or record a promise'
      : !idMatched
        ? 'Verify rider ID'
        : !bikeVerified
          ? 'Check bike chassis'
          : pendingRepairDebt > 0
            ? 'Track repair approval'
            : 'Keep account monitored';
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.detailContent}>
        <TouchableOpacity style={styles.backButton} onPress={() => setSelectedCustomer(null)}>
          <Text style={styles.backText}>Back to Portfolio</Text>
        </TouchableOpacity>

        <View style={styles.detailLayout}>
          <View style={styles.mainPanel}>
            <View style={styles.sectionHeader}>
              <Text style={styles.title}>{maskName(customer.name)}</Text>
              <Status styles={styles} status={customer.overdue ? 'Overdue' : customer.status} />
            </View>

            <View style={styles.nextActionStrip}>
              <View style={styles.nextActionCopy}>
                <Text style={styles.infoLabel}>Next best action</Text>
                <Text style={styles.nextActionText}>{nextAction}</Text>
              </View>
              <View style={styles.nextActionButtons}>
                <TouchableOpacity style={styles.nextActionButtonAlt} onPress={() => createRiderTask(customer, nextAction, `System next action for ${customer.name}`)}>
                  <Text style={styles.nextActionButtonAltText}>Create task</Text>
                </TouchableOpacity>
              </View>
              {!!messageStatus && <Text style={styles.messageStatus}>{messageStatus}</Text>}
              <View style={styles.statusBadgeRow}>
                <Text style={[styles.miniBadge, idMatched ? styles.goodBadge : styles.pendingBadge]}>{idMatched ? 'ID matched' : 'ID pending'}</Text>
                <Text style={[styles.miniBadge, bikeVerified ? styles.goodBadge : styles.pendingBadge]}>{bikeVerified ? 'Bike verified' : 'Bike check'}</Text>
                {!!openPromises && <Text style={[styles.miniBadge, styles.pendingBadge]}>{openPromises} promise</Text>}
                {!!pendingRepairDebt && <Text style={[styles.miniBadge, styles.warnBadge]}>Repair pending</Text>}
              </View>
            </View>

            <View style={styles.protectionBox}>
              <Text style={styles.toolTitle}>Agent Cheat Protection</Text>
              <Text style={styles.subtle}>Agent code locked: {agent.agentCode || 'Unassigned'} | Rider assigned: {customer.assignedAgentCode || customer.agentCode || 'Unknown'}</Text>
              <Text style={styles.subtle}>Profile changes need admin approval. Duplicate rider checks use National ID, phone, rider card, and chassis.</Text>
              <Text style={styles.offlineBadge}>Offline-ready: captures can be saved as pending sync when real backend sync is connected.</Text>
            </View>

            <View style={styles.promiseTracker}>
              <Text style={styles.toolTitle}>Promise Tracker</Text>
              <Text style={styles.subtle}>Open promises: {openPromises} | Due today: {promisesDueToday} | Broken: {brokenPromises}</Text>
            </View>

            {(linkedContracts.length || customer.overdue || excuseCount || brokenPromises || !idMatched || !bikeVerified) ? (
              <View style={styles.mindShield}>
                <Text style={styles.toolTitle}>Customer Mind Game Shield</Text>
                {!!linkedContracts.length && <Text style={styles.subtle}>Old contract found: {linkedContracts.length} linked record{linkedContracts.length > 1 ? 's' : ''}.</Text>}
                {customer.overdue && <Text style={styles.subtle}>Debt warning: {formatKes(payment.remaining)} still active.</Text>}
                {!idMatched && <Text style={styles.subtle}>ID not fully matched yet.</Text>}
                {!bikeVerified && <Text style={styles.subtle}>Bike/chassis check not fully verified yet.</Text>}
                {!!excuseCount && <Text style={styles.subtle}>Excuse pattern: {excuseCount} excuse record{excuseCount > 1 ? 's' : ''} captured.</Text>}
                {!!brokenPromises && <Text style={styles.subtle}>Broken promises: {brokenPromises}.</Text>}
              </View>
            ) : null}

            <View style={styles.detailShell}>
              {!selectedAction && <View style={styles.detailTabRail}>
                {detailTabs.map((tab) => (
                  <TouchableOpacity key={tab} style={[styles.detailTab, detailTab === tab && styles.detailTabActive]} onPress={() => setDetailTab(tab)}>
                    <Text style={[styles.detailTabText, detailTab === tab && styles.detailTabTextActive]}>{tab}</Text>
                    <Text style={[styles.detailTabHint, detailTab === tab && styles.detailTabHintActive]}>
                      {{
                        Repairs: 'Damage debt requests',
                        History: 'Agent notes',
                      }[tab]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>}
              <View style={styles.detailTabBody}>

            {detailTab === 'Summary' && (
              <>
            <View style={styles.idCard}>
              <View>
                <Text style={styles.idLabel}>BUMU RIDER CARD</Text>
                <Text style={styles.idValue}>{customer.cardId || 'Generating...'}</Text>
                <Text style={styles.subtle}>Unique system ID. Never reused for another rider.</Text>
              </View>
              <View>
                <Text style={styles.idLabel}>Rider Person ID</Text>
                <Text style={styles.idValue}>{customer.riderPersonId || 'Pending'}</Text>
                <Text style={styles.subtle}>Same person across old and new contracts.</Text>
              </View>
              <View>
                <Text style={styles.idLabel}>Contract ID</Text>
                <Text style={styles.idValue}>{customer.contractId || 'Pending'}</Text>
                <Text style={styles.subtle}>Unique bike/debt contract for this agent.</Text>
              </View>
              <View>
                <Text style={styles.idLabel}>Agent Assignment</Text>
                <Text style={styles.idValue}>{customer.riderAssignmentId || 'Pending assignment'}</Text>
                <Text style={styles.subtle}>Assigned {customer.assignedAgentCode || customer.agentCode || agent.agentCode} | Registered {customer.registeredByAgentCode || customer.agentCode || agent.agentCode}</Text>
              </View>
              <View>
                <Text style={styles.idLabel}>Balance Status</Text>
                <Text style={styles.idValue}>{payment.remaining > 0 ? 'Outstanding' : 'Cleared'}</Text>
                <Text style={styles.subtle}>{payment.remaining > 0 ? `${formatKes(payment.remaining)} left` : 'No company balance left'}</Text>
              </View>
            </View>
            {!!customer.assignmentNote && (
              <View style={styles.assignmentNotice}>
                <Text style={styles.flagBannerText}>{customer.assignmentNote}</Text>
              </View>
            )}

            <View style={styles.profileGrid}>
              <View style={styles.riderPhotoBox}>
                {riderPhoto ? (
                  <Image source={{ uri: riderPhoto }} style={styles.riderPhotoLarge} />
                ) : (
                  <View style={styles.riderPhotoFallback}>
                    <Text style={styles.riderPhotoInitial}>{String(customer.name || 'R').slice(0, 1).toUpperCase()}</Text>
                  </View>
                )}
                <Text style={styles.subtle}>Rider face photo</Text>
              </View>
              <Info styles={styles} label="Name" value={maskName(customer.name)} />
              <Info styles={styles} label="ID Number" value={maskId(customer.nationalId || '-')} />
              <Info styles={styles} label="Phone" value={maskPhone(customer.phone)} />
              <Info styles={styles} label="Occupation" value={customer.occupation || '-'} />
              <Info styles={styles} label="Location" value={customer.location || customer.region || '-'} />
              <View style={[styles.infoBox, styles[risk.tone]]}>
                <Text style={styles.infoLabel}>Risk Score</Text>
                <Text style={styles.infoValue}>{risk.score}/100</Text>
                <Text style={styles.subtle}>{risk.label}</Text>
              </View>
            </View>

            {!simpleMode && <Text style={styles.sectionTitle}>Registration Steps</Text>}
            {!simpleMode && (
            <View style={styles.timeline}>
              {['Draft', 'Rider Verified', 'NOK Verified', 'Pending Screening', customer.status].map((item, index) => (
                <View key={`${item}-${index}`} style={styles.timelineItem}>
                  <Text style={styles.timelineIndex}>{index + 1}</Text>
                  <Text style={styles.timelineText}>{item}</Text>
                </View>
              ))}
            </View>
            )}
              </>
            )}

            {detailTab === 'Verify' && (
              <>
            <Text style={styles.sectionTitle}>Verification Tools</Text>
            <View style={styles.agentGrid}>
              <View style={styles.agentBox}>
                <Text style={styles.toolTitle}>Field Visit Proof</Text>
                <TextInput style={styles.input} placeholder="Visit note / location" value={visitNote} onChangeText={setVisitNote} />
                <TouchableOpacity style={styles.actionButton} onPress={() => addVisitProof(customer)}>
                  <Text style={styles.actionText}>Confirm Visit</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.agentBox}>
                <Text style={styles.toolTitle}>Customer Verification Checklist</Text>
                {checklistItems.map(([key, label]) => {
                  const checked = !!customer.verificationChecklist?.[key];
                  return (
                    <TouchableOpacity key={key} style={[styles.checkRow, checked && styles.checkRowActive]} onPress={() => onChecklistChange(customer.id, key, !checked)}>
                      <Text style={[styles.checkMark, checked && styles.checkTextActive]}>{checked ? 'Yes' : 'No'}</Text>
                      <Text style={[styles.checkLabel, checked && styles.checkTextActive]}>{label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.agentBox}>
                <Text style={styles.toolTitle}>Promise To Pay</Text>
                <View style={styles.inlineInputs}>
                  <TextInput style={styles.smallInput} placeholder="KES" value={promiseAmount} onChangeText={setPromiseAmount} keyboardType="number-pad" />
                  <TextInput style={styles.smallInput} placeholder="YYYY-MM-DD" value={promiseDate} onChangeText={setPromiseDate} />
                </View>
                <TextInput style={styles.input} placeholder="Promise note" value={promiseNote} onChangeText={setPromiseNote} />
                <TouchableOpacity style={styles.actionButton} onPress={() => addPromise(customer)}>
                  <Text style={styles.actionText}>Save Promise</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.agentBox}>
                <Text style={styles.toolTitle}>Chassis Quick Check</Text>
                <TextInput style={styles.input} placeholder="Type chassis seen on bike" value={chassisCheck} onChangeText={setChassisCheck} />
                <TouchableOpacity style={styles.actionButton} onPress={() => checkChassis(customer)}>
                  <Text style={styles.actionText}>Check Bike</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.agentBox}>
                <Text style={styles.toolTitle}>Agent ID Scan / Capture</Text>
                <TouchableOpacity style={styles.captureButton} onPress={pickIdCardImage}>
                  <Text style={styles.captureButtonText}>📷 Snap / Upload ID Card</Text>
                </TouchableOpacity>
                {!!scanImageUri && <Image source={{ uri: scanImageUri }} style={styles.scanPreview} resizeMode="cover" />}
                {!!scanStatus && <Text style={styles.messageStatus}>{scanStatus}</Text>}
                <TextInput style={styles.input} placeholder="ID number read from card" value={scanIdNumber} onChangeText={setScanIdNumber} keyboardType="number-pad" />
                <TextInput style={styles.input} placeholder="Photo/upload file name" value={scanFileName} onChangeText={setScanFileName} />
                <TouchableOpacity style={styles.actionButton} onPress={() => scanIdCard(customer)}>
                  <Text style={styles.actionText}>Scan / Check ID</Text>
                </TouchableOpacity>
              </View>

              {!simpleMode && <View style={styles.agentBox}>
                <Text style={styles.toolTitle}>Evidence Log</Text>
                <TextInput style={styles.input} placeholder="Photo/file name from camera or upload" value={evidenceName} onChangeText={setEvidenceName} />
                <TextInput style={styles.input} placeholder="Evidence note" value={evidenceNote} onChangeText={setEvidenceNote} />
                <TouchableOpacity style={styles.actionButton} onPress={() => addEvidence(customer)}>
                  <Text style={styles.actionText}>Save Evidence</Text>
                </TouchableOpacity>
              </View>}

            </View>

            {!simpleMode && <Text style={styles.sectionTitle}>Customer Excuse Pattern</Text>}
            {!simpleMode && (
            <View style={styles.excuseWrap}>
              {excuseOptions.map((excuse) => (
                <TouchableOpacity key={excuse} style={styles.excuseChip} onPress={() => addExcuse(customer, excuse)}>
                  <Text style={styles.excuseText}>{excuse}</Text>
                </TouchableOpacity>
              ))}
            </View>
            )}
              </>
            )}

            {detailTab === 'History' && (
              <>
            <Text style={styles.sectionTitle}>Agent History</Text>
            <View style={styles.noteTimeline}>
              <Text style={styles.toolTitle}>Smart Rider Timeline</Text>
              {smartTimeline.length ? smartTimeline.map((item, index) => (
                <View key={`${item.title}-${index}`} style={styles.noteRow}>
                  <Text style={styles.noteTitle}>{item.title}</Text>
                  <Text style={styles.subtle}>{item.detail}</Text>
                  <Text style={styles.noteMeta}>{item.time}</Text>
                </View>
              )) : <Text style={styles.subtle}>No timeline records yet.</Text>}
            </View>
            <View style={styles.noteTimeline}>
              {(customer.riskNotes || []).length ? customer.riskNotes.map((item) => (
                <View key={item.id} style={styles.noteRow}>
                  <Text style={styles.noteTitle}>{item.title}</Text>
                  <Text style={styles.subtle}>{item.detail}</Text>
                  <Text style={styles.noteMeta}>{item.time} | Agent {item.agentCode}</Text>
                </View>
              )) : <Text style={styles.subtle}>No agent risk notes yet.</Text>}
            </View>
              </>
            )}
            {detailTab === 'Payments' && (
              <>
                <Text style={styles.sectionTitle}>Payment Summary</Text>
                <View style={styles.profileGrid}>
                  <Info styles={styles} label="Total Price" value={formatKes(payment.total)} />
                  <Info styles={styles} label="Paid" value={formatKes(payment.paid)} />
                  <Info styles={styles} label="Remaining" value={formatKes(payment.remaining)} />
                  <Info styles={styles} label="Pending Repair Debt" value={formatKes(pendingRepairDebt)} />
                  <Info styles={styles} label="Projected Balance" value={formatKes(projectedBalance)} />
                  <Info styles={styles} label="Progress" value={`${payment.percent}%`} />
                </View>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${payment.percent}%` }]} />
                </View>
                <Text style={styles.progressText}>{payment.percent}% paid</Text>
              </>
            )}
            {detailTab === 'Contracts' && (
              <>
                <Text style={styles.sectionTitle}>Linked Contracts</Text>
                <View style={styles.linkedPanel}>
                  {linkedContracts.length ? linkedContracts.map((contract) => {
                    const linkedPayment = paymentSummary(contract);
                    return (
                      <View key={`${contract.id}-contract-card`} style={styles.contractCard}>
                        <Text style={styles.noteTitle}>{contract.contractId || contract.cardId || contract.customerCardId || 'No contract ID'}</Text>
                        <Text style={styles.subtle}>Agent {contract.assignedAgentCode || contract.agentCode || 'Unknown'}</Text>
                        <View style={styles.statusBadgeRow}>
                          <Text style={[styles.miniBadge, linkedPayment.remaining > 0 ? styles.warnBadge : styles.goodBadge]}>{linkedPayment.remaining > 0 ? 'Active debt' : 'Cleared'}</Text>
                          <Text style={[styles.miniBadge, styles.infoBadge]}>{contract.bike || 'Bike not set'}</Text>
                          <Text style={[styles.miniBadge, styles.infoBadge]}>Seq {contract.contractSequence || 1}</Text>
                        </View>
                        <Text style={styles.projectedText}>{linkedPayment.remaining > 0 ? formatKes(linkedPayment.remaining) : formatKes(0)}</Text>
                      </View>
                    );
                  }) : <Text style={styles.subtle}>No old contracts linked to this rider yet.</Text>}
                </View>
                <Text style={styles.sectionTitle}>Rider Transfer Request</Text>
                <View style={styles.agentBoxWide}>
                  <Text style={styles.subtle}>Transfer keeps the same Rider Person ID: {customer.riderPersonId || 'Pending'}. It does not create a new rider identity account.</Text>
                  <Text style={styles.subtle}>{payment.remaining > 0 ? `Blocked until finance/admin approves because active balance is ${formatKes(payment.remaining)}.` : 'Eligible for transfer request because no active rider balance is showing.'}</Text>
                  <TextInput style={styles.input} placeholder="Transfer note for admin/finance" value={transferNote} onChangeText={setTransferNote} />
                  <TouchableOpacity style={styles.actionButton} onPress={() => requestTransfer(customer)}>
                    <Text style={styles.actionText}>Submit Transfer Request</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.noteTimeline}>
                  {(customer.transferRequests || []).length ? customer.transferRequests.map((item) => (
                    <View key={item.id} style={styles.noteRow}>
                      <Text style={styles.noteTitle}>{item.title || 'Transfer request'}</Text>
                      <Text style={styles.subtle}>{item.status || 'Pending admin/finance approval'} | {item.fromAgentCode || 'Unknown'} to {item.toAgentCode || agent.agentCode}</Text>
                      <Text style={styles.subtle}>Balance at request: {formatKes(item.balance || 0)}</Text>
                      {!!item.note && <Text style={styles.subtle}>Note: {item.note}</Text>}
                      <Text style={styles.noteMeta}>{item.time} | Agent {item.agentCode}</Text>
                    </View>
                  )) : <Text style={styles.subtle}>No transfer request submitted yet.</Text>}
                </View>
              </>
            )}
            {detailTab === 'Repairs' && (
              <>
                <Text style={styles.sectionTitle}>Repair Debt Request</Text>
                <View style={styles.agentBoxWide}>
                  <TextInput style={styles.input} placeholder="Repair cost" value={repairCost} onChangeText={setRepairCost} keyboardType="number-pad" />
                  <TextInput style={styles.input} placeholder="Damage description" value={repairDamage} onChangeText={setRepairDamage} />
                  <View style={styles.repairEvidenceBox}>
                    <Text style={styles.toolTitle}>Repair evidence photo</Text>
                    <Text style={styles.subtle}>{repairEvidence || 'Upload chooses an existing photo. Snap Photo opens the device camera.'}</Text>
                    {!!repairEvidencePreview && <Image source={{ uri: repairEvidencePreview }} style={styles.repairEvidencePreview} />}
                    <View style={styles.evidenceActions}>
                      <TouchableOpacity style={styles.captureButton} onPress={pickRepairEvidenceUpload}>
                        <Text style={styles.captureButtonText}>Upload Photo</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.actionButton} onPress={openRepairEvidenceCamera}>
                        <Text style={styles.actionText}>📷 Snap Photo</Text>
                      </TouchableOpacity>
                    </View>
                    {!!repairCamera && (
                      <View style={styles.repairCameraPanel}>
                        {React.createElement('video', {
                          ref: repairVideoRef,
                          autoPlay: true,
                          playsInline: true,
                          muted: true,
                          style: styles.repairCameraPreview,
                        })}
                        <View style={styles.evidenceActions}>
                          <TouchableOpacity style={styles.actionButton} onPress={snapRepairEvidence}>
                            <Text style={styles.actionText}>📷 Use Photo</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.captureButton} onPress={closeRepairCamera}>
                            <Text style={styles.captureButtonText}>📷 Close Camera</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                    {!!repairEvidenceError && <Text style={styles.error}>{repairEvidenceError}</Text>}
                  </View>
                  <View style={styles.balancePreview}>
                    <Text style={styles.subtle}>Current balance: {formatKes(payment.remaining)}</Text>
                    <Text style={styles.subtle}>Pending repair debt: {formatKes(pendingRepairDebt + repairAmount)}</Text>
                    <Text style={styles.subtle}>Payment plan impact: {addedRepairDays ? `${addedRepairDays} extra installment day${addedRepairDays > 1 ? 's' : ''}` : 'Enter repair cost to preview plan impact.'}</Text>
                    <Text style={styles.projectedText}>Projected balance: {formatKes(repairProjectedBalance)}</Text>
                  </View>
                  <TouchableOpacity style={styles.actionButton} onPress={() => addRepairDebtRequest(customer)}>
                    <Text style={styles.actionText}>Submit Repair Request</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.sectionTitle}>Repair Request History</Text>
                <View style={styles.noteTimeline}>
                  {(customer.repairDebtRequests || []).length ? customer.repairDebtRequests.map((item) => (
                    <View key={item.id} style={styles.noteRow}>
                      <Text style={styles.noteTitle}>{item.damage || 'Repair request'} - {formatKes(item.amount)}</Text>
                      <Text style={styles.subtle}>{item.detail}</Text>
                      {!!item.evidencePreview && <Image source={{ uri: item.evidencePreview }} style={styles.repairEvidencePreview} />}
                      <Text style={styles.noteMeta}>{item.status || 'Pending approval'} | {item.time}</Text>
                    </View>
                  )) : <Text style={styles.subtle}>No repair requests captured yet.</Text>}
                </View>
              </>
            )}
              </View>
            </View>
          </View>

          <View style={[styles.sidePanel, detailTab !== 'Payments' && styles.hidden]}>
            {customer.flagged && (
              <View style={styles.flagBanner}>
                <Text style={styles.flagBannerText}>Flagged for review — high risk</Text>
              </View>
            )}
            <TouchableOpacity
              style={styles.quickAction}
              onPress={() => onCreateTask(customer.id, `Contact ${customer.name}`, 'Confirm payment schedule and documents.')}
            >
              <Text style={styles.quickActionText}>Create follow-up task</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickAction}
              onPress={() => onCreateTask(customer.id, `Verify ${customer.name} status`, 'Review rider account and confirm next action.')}
            >
              <Text style={styles.quickActionText}>Schedule review</Text>
            </TouchableOpacity>

            <Text style={styles.sectionTitle}>Send Rider Text</Text>
            <View style={styles.messageBox}>
              <TextInput
                style={styles.messageInput}
                placeholder={`Message to ${maskName(customer.name)}`}
                placeholderTextColor={theme === 'dark' ? '#6b7a8b' : '#94a3b8'}
                value={messageText}
                onChangeText={(value) => { setMessageText(value); setMessageStatus(''); }}
                multiline
              />
              {!!messageStatus && <Text style={styles.messageStatus}>{messageStatus}</Text>}
              <TouchableOpacity
                style={styles.messageButton}
                onPress={() => {
                  if (!messageText.trim()) {
                    setMessageStatus('Enter a short message before sending.');
                    return;
                  }
                  onSendMessage(customer.id, messageText.trim());
                  setMessageText('');
                  setMessageStatus('Message queued and rider notified.');
                }}
              >
                <Text style={styles.messageButtonText}>Send Text Message</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionTitle}>Payment Calendar</Text>
            <View style={styles.calendarHeader}>
              <Text style={styles.calendarMonth}>{monthNames[calendarMonth]} {selectedCalendarDay || 1}, {calendarYear}</Text>
              <View style={styles.calendarNav}>
                <TouchableOpacity onPress={() => moveCalendar(-1)}>
                  <Text style={styles.calendarNavText}>◀</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => moveCalendar(1)}>
                  <Text style={styles.calendarNavText}>▶</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.dateSearchBar}>
              <TouchableOpacity style={styles.dateMiniButton} onPress={() => moveCalendar(-1)}>
                <Text style={styles.dateMiniButtonText}>{'<'}</Text>
              </TouchableOpacity>
              <TextInput
                style={styles.dateSearchInput}
                value={detailDateSearch}
                onChangeText={applyDetailDateSearch}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={theme === 'dark' ? '#6b7a8b' : '#94a3b8'}
              />
              <TouchableOpacity style={styles.dateMiniButton} onPress={() => moveCalendar(1)}>
                <Text style={styles.dateMiniButtonText}>{'>'}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.calendarGrid}>
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((label) => (
                <Text key={label} style={styles.calendarDayName}>{label}</Text>
              ))}
              {calendarDays.map((cell) => {
                const hasDue = cell.events.some((event) => event.type === 'due');
                const hasPayment = cell.events.some((event) => event.type === 'payment');
                return (
                  <TouchableOpacity
                    key={cell.day}
                    style={[
                      styles.calendarDay,
                      cell.isSelected && styles.calendarDaySelected,
                      hasDue && styles.calendarDayDue,
                      hasPayment && styles.calendarDayPaid,
                    ]}
                    onPress={() => {
                      setSelectedCalendarDay(cell.day);
                      setDetailDateSearch(dateInputValue(calendarYear, calendarMonth, cell.day));
                    }}
                  >
                    <Text style={styles.calendarDayNumber}>{cell.day}</Text>
                    {cell.events.length > 0 && <Text style={styles.calendarBadge}>{cell.events.length} item{cell.events.length > 1 ? 's' : ''}</Text>}
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={styles.calendarDetail}>
              <Text style={styles.calendarDetailTitle}>Details for {monthNames[calendarMonth]} {selectedCalendarDay || 1}</Text>
              {selectedDayEvents.length ? selectedDayEvents.map((event, index) => (
                <Text key={`${event.type}-${index}`} style={styles.calendarDetailText}>• {event.label}</Text>
              )) : <Text style={styles.calendarDetailText}>No payments or due items on this date.</Text>}
            </View>

            <Text style={styles.sectionTitle}>Bike Details</Text>
            <Info styles={styles} label="Bike Model" value={customer.bike} />
            <Info styles={styles} label="Chassis Number" value={customer.chassis || '-'} />
            <Info styles={styles} label="Deposit" value={customer.deposit || formatKes(customer.depositAmount || 0)} />
            <Info styles={styles} label="Installment Plan" value={customer.installment || '-'} />

            <Text style={styles.sectionTitle}>Payment Progress</Text>
            <View style={styles.paymentSummary}>
              <Info styles={styles} label="Total Price" value={formatKes(payment.total)} />
              <Info styles={styles} label="Deposit / Paid" value={formatKes(payment.paid)} />
              <Info styles={styles} label="Remaining" value={formatKes(payment.remaining)} />
              <Info styles={styles} label="Pending Repair Debt" value={formatKes(pendingRepairDebt)} />
              <Info styles={styles} label="Projected Balance" value={formatKes(projectedBalance)} />
              <Info styles={styles} label="Progress" value={`${payment.percent}%`} />
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${payment.percent}%` }]} />
            </View>
            <Text style={styles.progressText}>{payment.percent}% paid</Text>

            <Text style={styles.sectionTitle}>Record Payment</Text>
            <View style={styles.paymentForm}>
              <TextInput style={styles.input} placeholder="Payment amount" value={paymentAmount} onChangeText={setPaymentAmount} keyboardType="number-pad" />
              <TextInput style={styles.input} placeholder="M-Pesa code / receipt number" value={paymentMpesaCode} onChangeText={setPaymentMpesaCode} />
              <TextInput style={styles.input} placeholder="Payer phone" value={paymentPayerPhone} onChangeText={setPaymentPayerPhone} keyboardType="phone-pad" />
              <TextInput style={styles.input} placeholder="Proof photo/file name" value={paymentProofFile} onChangeText={setPaymentProofFile} />
              <TextInput style={styles.input} placeholder="Note (optional)" value={paymentNote} onChangeText={setPaymentNote} />
              {!!paymentMpesaCode && (customer.transactions || []).some((tx) => tx.mpesaCode === paymentMpesaCode) && (
                <Text style={styles.error}>Duplicate transaction warning: this M-Pesa code already exists for this rider.</Text>
              )}
              {!!paymentError && <Text style={styles.error}>{paymentError}</Text>}
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => {
                  const amount = Number(String(paymentAmount).replace(/[^\d.]/g, ''));
                  if (!amount || amount <= 0) {
                    setPaymentError('Enter a valid payment amount.');
                    return;
                  }
                  onAddPayment(customer.id, amount, paymentNote, { mpesaCode: paymentMpesaCode.trim(), payerPhone: paymentPayerPhone.trim(), proofFile: paymentProofFile.trim() });
                  setPaymentAmount('');
                  setPaymentNote('');
                  setPaymentMpesaCode('');
                  setPaymentPayerPhone('');
                  setPaymentProofFile('');
                  setPaymentError('');
                }}
              >
                <Text style={styles.actionText}>Add Payment</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionTitle}>Transaction History</Text>
            {customer.transactions?.length ? (
              customer.transactions.slice().reverse().map((tx) => (
                <View key={tx.id} style={styles.transactionRow}>
                  <Text style={styles.transactionDate}>{tx.date}</Text>
                  <Text style={styles.transactionText}>{tx.type}: KES {tx.amount.toLocaleString()}</Text>
                  {!!tx.mpesaCode && <Text style={styles.subtle}>M-Pesa: {tx.mpesaCode} | Payer: {tx.payerPhone || 'Unknown'} | Proof: {tx.proofFile || 'Not attached'}</Text>}
                  {!!tx.duplicateWarning && <Text style={styles.error}>Duplicate receipt warning captured.</Text>}
                  <Text style={styles.subtle}>{tx.note || 'Recorded payment'} • Balance KES {tx.balanceAfter.toLocaleString()}</Text>
                </View>
              ))
            ) : (
              <View style={styles.transaction}>
                <Text style={styles.infoValue}>{customer.lastPayment}</Text>
                <Text style={styles.subtle}>Latest recorded payment</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{featureTitle}</Text>
        <TouchableOpacity style={styles.exportButton} onPress={exportCsv}>
          <Text style={styles.exportText}>Export CSV</Text>
        </TouchableOpacity>
      </View>
      {!isPaymentCalendar && <View style={styles.searchPanel}>
        <TextInput style={styles.searchInput} placeholder="Search name, ID, phone, or card ID" value={search} onChangeText={setSearch} />
        <View style={styles.selectionGuide}>
          <Text style={styles.toolTitle}>{featureTitle}</Text>
          <Text style={styles.subtle}>{featureHint}</Text>
        </View>
        {(!selectedAction || isVerification) && <View style={styles.agentScorePanel}>
          <Text style={styles.toolTitle}>Agent Follow-up Score</Text>
          <Text style={styles.scoreValue}>{followupScore}%</Text>
          <Text style={styles.subtle}>{followedRisky} of {riskyCustomers.length} risky riders have an agent action recorded.</Text>
        </View>}
        <View style={styles.filterRow}>
          {availableFilters.map((item) => (
            <TouchableOpacity key={item} style={[styles.filterChip, filter === item && styles.filterChipActive]} onPress={() => setFilter(item)}>
              <Text style={[styles.filterText, filter === item && styles.filterTextActive]}>{item}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>}

      {(isPaymentCalendar || isPaymentsHub) && <View style={styles.portfolioCalendar}>
        <View style={styles.calendarHeader}>
          <View>
            <Text style={styles.sectionTitle}>Payment Workflow Calendar</Text>
            <Text style={styles.subtle}>Agent {agent.agentCode || 'Unassigned'} collections by day, week, or month.</Text>
          </View>
          <View style={styles.calendarNav}>
            <TouchableOpacity onPress={() => movePortfolioCalendar(-1)}>
              <Text style={styles.calendarNavText}>{'<'}</Text>
            </TouchableOpacity>
            <Text style={styles.calendarMonth}>{monthNames[portfolioCalendarMonth]} {portfolioCalendarYear}</Text>
            <TouchableOpacity onPress={() => movePortfolioCalendar(1)}>
              <Text style={styles.calendarNavText}>{'>'}</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.viewSwitch}>
          {['Day', 'Week', 'Month'].map((item) => (
            <TouchableOpacity key={item} style={[styles.viewButton, paymentView === item && styles.viewButtonActive]} onPress={() => setPaymentView(item)}>
              <Text style={[styles.viewText, paymentView === item && styles.viewTextActive]}>{item}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.dateSearchBar}>
          <TouchableOpacity style={styles.dateMiniButton} onPress={() => movePortfolioCalendar(-1)}>
            <Text style={styles.dateMiniButtonText}>{'<'}</Text>
          </TouchableOpacity>
          <TextInput
            style={styles.dateSearchInput}
            value={portfolioDateSearch}
            onChangeText={applyPortfolioDateSearch}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={theme === 'dark' ? '#6b7a8b' : '#94a3b8'}
          />
          <TouchableOpacity style={styles.dateMiniButton} onPress={() => movePortfolioCalendar(1)}>
            <Text style={styles.dateMiniButtonText}>{'>'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.todayButton} onPress={useTodayForPortfolio}>
            <Text style={styles.todayButtonText}>Today</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.calendarGrid}>
          {portfolioCalendarDays.map((cell) => (
            <TouchableOpacity
              key={cell.day}
              style={[styles.calendarDay, cell.isSelected && styles.calendarDaySelected, cell.hasDue && styles.calendarDayDue, cell.hasTransactions && styles.calendarDayPaid]}
              onPress={() => {
                setPortfolioCalendarDay(cell.day);
                setPortfolioDateSearch(dateInputValue(portfolioCalendarYear, portfolioCalendarMonth, cell.day));
                setPortfolioBucket('All');
              }}
            >
              <Text style={styles.calendarDayNumber}>{cell.day}</Text>
              {(cell.hasDue || cell.hasTransactions) && <Text style={styles.calendarBadge}>{cell.hasTransactions ? 'Paid' : 'Due'}</Text>}
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.workflowPanel}>
          <Text style={styles.calendarDetailTitle}>{paymentView} workflow for {monthNames[portfolioCalendarMonth]} {portfolioCalendarDay}</Text>
          <View style={styles.bucketGrid}>
            {portfolioBuckets.map((bucket) => (
              <TouchableOpacity
                key={bucket.name}
                style={[styles.bucketCard, portfolioBucket === bucket.name && styles.bucketCardActive]}
                onPress={() => setPortfolioBucket(bucket.name)}
              >
                <Text style={[styles.bucketLabel, portfolioBucket === bucket.name && styles.bucketTextActive]}>{bucket.name}</Text>
                <Text style={[styles.bucketValue, portfolioBucket === bucket.name && styles.bucketTextActive]}>{bucket.count}</Text>
                <Text style={[styles.bucketMeta, portfolioBucket === bucket.name && styles.bucketTextActive]}>{formatKes(bucket.total)}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {visiblePortfolioRows.length ? visiblePortfolioRows.map((row) => (
            <TouchableOpacity
              key={row.id}
              style={styles.workflowRow}
              onPress={() => {
                const rider = agentCustomers.find((customer) => customer.id === row.customerId);
                if (rider) {
                  setSelectedCustomer(rider);
                setDetailTab('Repairs');
                }
              }}
            >
              <Text style={styles.workflowTitle}>{row.rider} - {row.type}</Text>
              <Text style={styles.workflowMeta}>{row.cardId} | Agent {row.agentCode} | {formatKes(row.amount)}</Text>
              <Text style={styles.subtle}>{row.bucket} | {row.status}: {row.detail}</Text>
            </TouchableOpacity>
          )) : <Text style={styles.subtle}>No rider workflow for this selection.</Text>}
        </View>
      </View>}

      {!isPaymentCalendar && <FlatList
        data={actionCustomers}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        renderItem={({ item }) => {
          const payment = paymentSummary(item);
          const depositNum = parseKesNumber(item.depositAmount || item.deposit);
          const depositWidth = payment.total ? Math.round((depositNum / payment.total) * 100) : 0;
          const paidAfterDeposit = Math.max(0, payment.paid - depositNum);
          const paidWidth = payment.total ? Math.round((paidAfterDeposit / payment.total) * 100) : 0;
          const remainingWidth = Math.max(0, 100 - depositWidth - paidWidth);
          const recentTx = (item.transactions || []).slice(-8);
          const checklist = item.verificationChecklist || {};
          const idReady = !!checklist.idSeen || (item.idScanLogs || []).some((log) => /match/i.test(log.result || log.detail || ''));
          const chassisReady = !!checklist.chassisConfirmed || (item.chassisChecks || []).some((log) => /match/i.test(log.result || log.detail || ''));
          const visitCount = (item.visitLogs || []).length;
          const promiseCount = (item.promiseLogs || []).length;
          const riderPhoto = item.documentFiles?.passportPreview;
          const contractCount = agentCustomers.filter((customer) => (
            customer.id !== item.id
            && (
              (item.riderPersonId && customer.riderPersonId === item.riderPersonId)
              || (item.nationalId && customer.nationalId === item.nationalId)
              || (item.phone && cleanPhone(customer.phone) === cleanPhone(item.phone))
            )
          )).length;
          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => {
                setSelectedCustomer(item);
                setDetailTab('Repairs');
              }}
              activeOpacity={0.86}
            >
              <View style={styles.cardHeader}>
                <View style={styles.cardIdentity}>
                  {riderPhoto ? (
                    <Image source={{ uri: riderPhoto }} style={styles.cardRiderPhoto} />
                  ) : (
                    <View style={styles.cardRiderInitial}>
                      <Text style={styles.cardRiderInitialText}>{String(item.name || 'R').slice(0, 1).toUpperCase()}</Text>
                    </View>
                  )}
                  <Text style={styles.cardTitle}>{maskName(item.name)}</Text>
                </View>
                <View style={styles.flagRow}>
                  {item.flagged && (
                    <View style={styles.flagPill}>
                      <Text style={styles.flagText}>FLAGGED</Text>
                    </View>
                  )}
                  <Status styles={styles} status={item.overdue ? 'Overdue' : item.status} />
                </View>
              </View>
              {isPaymentsHub || isCollectPayment ? (
                <>
                  <Text style={styles.featureMode}>Payment account</Text>
                  <Text style={styles.cardMeta}>Card ID: {item.cardId} | Contract: {item.contractId || 'Pending'}</Text>
                  <Text style={styles.cardMeta}>Phone: {maskPhone(item.phone)} | Last payment: {item.lastPaymentDate || 'No recent payment'}</Text>
                  <View style={styles.paymentRow}>
                    <Metric styles={styles} label="Paid" value={formatKes(payment.paid)} />
                    <Metric styles={styles} label="Balance" value={formatKes(payment.remaining)} />
                    <Metric styles={styles} label="Progress" value={`${payment.percent}%`} />
                  </View>
                  <View style={styles.progressBarBackground}>
                    <View style={[styles.progressFill, { width: `${payment.percent}%` }]} />
                  </View>
                  <Text style={styles.progressCaption}>Open this rider to record amount, payer phone, M-Pesa code, and payment proof.</Text>
                </>
              ) : isVerification ? (
                <>
                  <Text style={styles.featureMode}>Verification checklist</Text>
                  <Text style={styles.cardMeta}>{item.region || item.location} | {maskPhone(item.phone)} | ID {maskId(item.nationalId || '-')}</Text>
                  <Text style={styles.cardMeta}>Bike: {item.bike} | Chassis: {item.chassisNumber || item.chassis || 'Pending scan'}</Text>
                  <View style={styles.cardTagRow}>
                    <Text style={idReady ? styles.tagLabel : styles.riskChip}>{idReady ? 'ID matched' : 'ID pending'}</Text>
                    <Text style={chassisReady ? styles.tagLabel : styles.riskChip}>{chassisReady ? 'Chassis matched' : 'Chassis pending'}</Text>
                    <Text style={visitCount ? styles.tagLabel : styles.riskChip}>{visitCount ? `${visitCount} visit logs` : 'No visit log'}</Text>
                    <Text style={promiseCount ? styles.tagLabel : styles.riskChip}>{promiseCount ? `${promiseCount} promises` : 'No promise'}</Text>
                  </View>
                  <Text style={styles.progressCaption}>Open this rider to scan ID, upload passport or ID card, confirm bike/chassis, and save evidence.</Text>
                </>
              ) : isTransfer ? (
                <>
                  <Text style={styles.featureMode}>Contract and transfer review</Text>
                  <Text style={styles.cardMeta}>Person: {item.riderPersonId || 'Pending'} | Current agent: {item.assignedAgentCode || item.agentCode || agent.agentCode}</Text>
                  <Text style={styles.cardMeta}>Contract: {item.contractId || 'Pending'} | Assignment: {item.riderAssignmentId || 'Pending'}</Text>
                  {!!item.previousAgentCode && <Text style={styles.cardMeta}>Previous agent: {item.previousAgentCode}</Text>}
                  <View style={styles.paymentRow}>
                    <Metric styles={styles} label="Balance" value={formatKes(payment.remaining)} />
                    <Metric styles={styles} label="Linked" value={`${contractCount} records`} />
                    <Metric styles={styles} label="Status" value={payment.remaining > 0 ? 'Debt' : 'Clear'} />
                  </View>
                  <Text style={styles.progressCaption}>Open this rider to review old contracts, debt status, repairs, and transfer notes.</Text>
                </>
              ) : (
                <>
                  <Text style={styles.cardMeta}>Card ID: {item.cardId} | Contract: {item.contractId || 'Pending'}</Text>
                  <Text style={styles.cardMeta}>Person: {item.riderPersonId || 'Pending'} | Agent {item.assignedAgentCode || item.agentCode || agent.agentCode}</Text>
                  <Text style={styles.cardMeta}>{item.region || item.location} | {maskPhone(item.phone)} | ID {maskId(item.nationalId || '-')}</Text>
                  <View style={styles.cardTagRow}>
                    <Text style={styles.tagLabel}>{item.bike}</Text>
                    <Text style={styles.riskChip}>Risk {item.risk ?? 'N/A'}</Text>
                  </View>
                  <View style={styles.progressBarBackground}>
                    <View style={[styles.progressFill, { width: `${payment.percent}%` }]} />
                  </View>
                  <View style={styles.progressSummaryRow}>
                    <Text style={styles.progressCaption}>{payment.percent}% paid</Text>
                    <Text style={styles.progressCaption}>{formatKes(payment.remaining)} remaining</Text>
                  </View>
                </>
              )}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={<Text style={styles.emptyText}>No riders match this feature/filter. Try search, change status filter, or open Rider Portfolio.</Text>}
      />}
    </View>
  );
}

function Status({ styles, status }) {
  const key = status === 'Active' || status === 'Approved' ? 'activePill' : status === 'Overdue' || status === 'Rejected' ? 'overduePill' : 'pendingPill';
  return (
    <View style={[styles.statusPill, styles[key]]}>
      <Text style={styles.statusLabel}>{status}</Text>
    </View>
  );
}

function Metric({ styles, label, value }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.paymentLabel}>{label}</Text>
      <Text style={styles.paymentValue}>{value}</Text>
    </View>
  );
}

function Info({ styles, label, value }) {
  return (
    <View style={styles.infoBox}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const createStyles = (theme) => {
  const dark = theme === 'dark';
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: '#ffffff', paddingVertical: 16 },
    detailContent: { paddingBottom: 42 },
    headerRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 16 },
    title: { fontSize: 24, fontWeight: '800', color: dark ? '#f3f6fb' : '#0b1730', fontFamily: 'Georgia' },
    sectionTitle: { fontSize: 16, fontWeight: '800', color: dark ? '#f3f6fb' : '#0b1730', fontFamily: 'Georgia', marginTop: 18, marginBottom: 12 },
    subtle: { color: dark ? '#b8c3d7' : '#627083', fontSize: 12, lineHeight: 18, fontFamily: 'Georgia' },
    hidden: { display: 'none' },
    searchPanel: { backgroundColor: 'transparent', borderRadius: 0, padding: 0, marginBottom: 16, borderWidth: 0 },
    portfolioCalendar: { backgroundColor: dark ? '#092a75' : '#f5f8ff', borderRadius: 8, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: dark ? '#11264b' : '#e6eef3' },
    viewSwitch: { flexDirection: 'row', gap: 8, marginBottom: 12 },
    viewButton: { borderRadius: 10, borderWidth: 1, borderColor: dark ? '#11264b' : '#dce3ea', paddingVertical: 9, paddingHorizontal: 12, backgroundColor: dark ? '#0f1720' : '#f4f8f7' },
    viewButtonActive: { backgroundColor: '#0f5fff', borderColor: '#0f5fff' },
    viewText: { color: dark ? '#f3f6fb' : '#0b1730', fontFamily: 'Georgia', fontSize: 12, fontWeight: '800' },
    viewTextActive: { color: '#ffffff' },
    workflowPanel: { borderRadius: 8, borderWidth: 1, borderColor: dark ? '#11264b' : '#e6eef4', padding: 12, backgroundColor: dark ? '#0f1720' : '#f8fafc' },
    workflowRow: { borderBottomWidth: 1, borderBottomColor: dark ? '#11264b' : '#e6eef4', paddingVertical: 10 },
    workflowTitle: { color: dark ? '#f3f6fb' : '#0b1730', fontSize: 13, fontWeight: '900', fontFamily: 'Georgia', marginBottom: 4 },
    workflowMeta: { color: '#0f5fff', fontSize: 12, fontWeight: '800', fontFamily: 'Georgia', marginBottom: 4 },
    bucketGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
    bucketCard: { flexGrow: 1, minWidth: 104, borderRadius: 10, borderWidth: 1, borderColor: dark ? '#1a3158' : '#d8e3f7', backgroundColor: dark ? '#111b24' : '#ffffff', padding: 10 },
    bucketCardActive: { backgroundColor: '#0f5fff', borderColor: '#0f5fff' },
    bucketLabel: { color: dark ? '#b8c3d7' : '#627083', fontSize: 11, fontWeight: '900', fontFamily: 'Georgia' },
    bucketValue: { color: dark ? '#f3f6fb' : '#0b1730', fontSize: 21, fontWeight: '900', fontFamily: 'Georgia', marginTop: 2 },
    bucketMeta: { color: dark ? '#b8c3d7' : '#627083', fontSize: 11, fontWeight: '700', fontFamily: 'Georgia', marginTop: 2 },
    bucketTextActive: { color: '#ffffff' },
    assignmentNotice: { backgroundColor: dark ? '#2a2112' : '#fff8e6', borderColor: '#f3b949', borderWidth: 1, padding: 12, borderRadius: 10, marginBottom: 14 },
    linkedPanel: { borderRadius: 12, borderWidth: 1, borderColor: dark ? '#26364a' : '#e6eef4', backgroundColor: dark ? '#0f1720' : '#f8fafc', padding: 12, gap: 8, marginBottom: 12 },
    linkedRow: { borderBottomWidth: 1, borderBottomColor: dark ? '#11264b' : '#e6eef4', paddingBottom: 8 },
    contractCard: { borderRadius: 12, borderWidth: 1, borderColor: dark ? '#26364a' : '#d8e3f7', backgroundColor: dark ? '#111b24' : '#ffffff', padding: 12, gap: 6 },
    searchInput: { backgroundColor: dark ? '#0f1720' : '#f1f7f5', color: dark ? '#f3f6fb' : '#0b1730', borderRadius: 10, padding: 14, marginBottom: 12, fontFamily: 'Georgia', borderWidth: 1, borderColor: dark ? '#11264b' : '#dce3ea' },
    selectionGuide: { borderWidth: 1, borderColor: dark ? '#26364a' : '#d8e3f7', backgroundColor: dark ? '#0f1720' : '#f5f8ff', borderRadius: 8, padding: 12, marginBottom: 12 },
    agentScorePanel: { borderWidth: 0, borderTopWidth: 1, borderBottomWidth: 1, borderColor: dark ? '#2f7cff' : '#d8e3f7', backgroundColor: 'transparent', borderRadius: 0, paddingVertical: 12, marginBottom: 12 },
    scoreValue: { color: '#0f5fff', fontSize: 26, fontWeight: '900', fontFamily: 'Georgia', marginVertical: 2 },
    filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    filterChip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, backgroundColor: dark ? '#0f1720' : '#f1f7f5', borderWidth: 1, borderColor: dark ? '#11264b' : '#dce3ea' },
    filterChipActive: { backgroundColor: '#0f5fff', borderColor: '#0f5fff' },
    filterText: { color: dark ? '#f3f6fb' : '#0b1730', fontFamily: 'Georgia', fontSize: 12, fontWeight: '700' },
    filterTextActive: { color: '#ffffff' },
    exportButton: { backgroundColor: '#0f5fff', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14 },
    exportText: { color: '#ffffff', fontWeight: '800', fontFamily: 'Georgia', fontSize: 13 },
    listContainer: { paddingBottom: 24 },
    card: { backgroundColor: 'transparent', borderRadius: 0, paddingVertical: 16, paddingHorizontal: 0, marginBottom: 0, borderWidth: 0, borderBottomWidth: 1, borderColor: dark ? '#2f7cff' : '#d8e3f7' },
    cardHeader: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 12 },
    cardIdentity: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 },
    cardRiderPhoto: { width: 42, height: 42, borderRadius: 21, borderWidth: 2, borderColor: '#0f5fff', backgroundColor: dark ? '#07101f' : '#edf3ff' },
    cardRiderInitial: { width: 42, height: 42, borderRadius: 21, borderWidth: 2, borderColor: '#0f5fff', backgroundColor: dark ? '#07101f' : '#edf3ff', alignItems: 'center', justifyContent: 'center' },
    cardRiderInitialText: { color: '#0f5fff', fontSize: 15, fontWeight: '900', fontFamily: 'Georgia' },
    cardTitle: { fontSize: 16, fontWeight: '800', color: dark ? '#f3f6fb' : '#0b1730', fontFamily: 'Georgia', flex: 1 },
    featureMode: { color: '#0f5fff', fontSize: 12, fontWeight: '900', fontFamily: 'Georgia', marginBottom: 6, textTransform: 'uppercase' },
    cardMeta: { fontSize: 13, color: dark ? '#b8c3d7' : '#627083', marginBottom: 6, fontFamily: 'Georgia' },
    cardTagRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginBottom: 10 },
    tagLabel: { backgroundColor: dark ? '#0b2144' : '#eef5ff', color: dark ? '#8fff55' : '#0f5fff', fontSize: 12, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, fontWeight: '700', fontFamily: 'Georgia' },
    riskChip: { backgroundColor: '#fbe8eb', color: '#7a1515', fontSize: 12, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, fontWeight: '800', fontFamily: 'Georgia' },
    statusPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
    statusLabel: { fontSize: 12, fontWeight: '700', color: '#ffffff', fontFamily: 'Georgia' },
    activePill: { backgroundColor: '#6fe04e' },
    pendingPill: { backgroundColor: '#b86800' },
    overduePill: { backgroundColor: '#bd2a2a' },
    flagRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
    flagPill: { backgroundColor: '#bd2a2a', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 18, marginRight: 6 },
    flagText: { color: '#ffffff', fontWeight: '800', fontSize: 11, fontFamily: 'Georgia' },
    flagBanner: { backgroundColor: '#fff3f3', borderColor: '#f1c1c1', borderWidth: 1, padding: 10, borderRadius: 10, marginBottom: 12 },
    flagBannerText: { color: '#7a1515', fontWeight: '800', fontFamily: 'Georgia' },
    quickAction: { backgroundColor: '#0f5fff', borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14, marginBottom: 16 },
    quickActionText: { color: '#ffffff', fontFamily: 'Georgia', fontWeight: '800', textAlign: 'center' },
    nextActionStrip: { borderRadius: 8, borderWidth: 1, borderColor: dark ? '#26364a' : '#d8e3f7', backgroundColor: dark ? '#0f1720' : '#f5f8ff', padding: 12, marginBottom: 14, gap: 10 },
    nextActionCopy: { gap: 3 },
    nextActionText: { color: dark ? '#f3f6fb' : '#0b1730', fontSize: 16, fontWeight: '900', fontFamily: 'Georgia' },
    nextActionButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    nextActionButton: { backgroundColor: '#0f5fff', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12 },
    nextActionButtonText: { color: '#ffffff', fontSize: 12, fontWeight: '900', fontFamily: 'Georgia' },
    nextActionButtonAlt: { backgroundColor: dark ? '#223044' : '#edf3ff', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: dark ? '#334155' : '#dce3ea' },
    nextActionButtonAltText: { color: dark ? '#f3f6fb' : '#0f5fff', fontSize: 12, fontWeight: '900', fontFamily: 'Georgia' },
    protectionBox: { borderRadius: 8, borderWidth: 1, borderColor: dark ? '#26364a' : '#d8e3f7', backgroundColor: dark ? '#0f1720' : '#f5f8ff', padding: 12, marginBottom: 12, gap: 5 },
    mindShield: { borderRadius: 8, borderWidth: 1, borderColor: '#f3b949', backgroundColor: dark ? '#2a2112' : '#fff8e6', padding: 12, marginBottom: 12, gap: 5 },
    offlineBadge: { color: '#0f5fff', fontSize: 12, fontWeight: '900', fontFamily: 'Georgia', marginTop: 3 },
    statusBadgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    miniBadge: { borderRadius: 999, paddingVertical: 6, paddingHorizontal: 10, fontSize: 11, fontWeight: '900', fontFamily: 'Georgia', overflow: 'hidden' },
    goodBadge: { backgroundColor: '#0f5fff', color: '#ffffff' },
    pendingBadge: { backgroundColor: '#f3b949', color: '#0b1730' },
    warnBadge: { backgroundColor: '#bd2a2a', color: '#ffffff' },
    infoBadge: { backgroundColor: dark ? '#223044' : '#e8eef4', color: dark ? '#f3f6fb' : '#0b1730' },
    detailShell: { gap: 14 },
    detailTabRail: { width: '100%', gap: 8 },
    detailTab: { borderRadius: 10, borderWidth: 1, borderColor: dark ? '#26364a' : '#d8e3f7', backgroundColor: dark ? '#0f1720' : '#ffffff', paddingVertical: 11, paddingHorizontal: 12 },
    detailTabActive: { backgroundColor: '#0f5fff', borderColor: '#0f5fff' },
    detailTabText: { color: dark ? '#f3f6fb' : '#0b1730', fontSize: 12, fontWeight: '900', fontFamily: 'Georgia' },
    detailTabTextActive: { color: '#ffffff' },
    detailTabHint: { color: dark ? '#aebbd0' : '#627083', fontSize: 11, fontWeight: '700', fontFamily: 'Georgia', marginTop: 3 },
    detailTabHintActive: { color: '#e8fff3' },
    detailTabBody: { width: '100%', minWidth: 0 },
    agentGrid: { gap: 12 },
    agentBox: { width: '100%', borderRadius: 12, borderWidth: 1, borderColor: dark ? '#26364a' : '#e6eef4', backgroundColor: dark ? '#0f1720' : '#f8fafc', padding: 12, gap: 8 },
    agentBoxWide: { borderRadius: 12, borderWidth: 1, borderColor: dark ? '#26364a' : '#e6eef4', backgroundColor: dark ? '#0f1720' : '#f8fafc', padding: 12, gap: 8 },
    toolTitle: { color: dark ? '#f3f6fb' : '#0b1730', fontSize: 13, fontWeight: '900', fontFamily: 'Georgia', marginBottom: 4 },
    input: { borderWidth: 1, borderColor: dark ? '#334155' : '#dce3ea', borderRadius: 10, padding: 11, color: dark ? '#f8fafc' : '#0f1720', backgroundColor: dark ? '#030814' : '#ffffff', fontFamily: 'Georgia' },
    inlineInputs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    smallInput: { flex: 1, minWidth: 90, borderWidth: 1, borderColor: dark ? '#334155' : '#dce3ea', borderRadius: 10, padding: 11, color: dark ? '#f8fafc' : '#0f1720', backgroundColor: dark ? '#030814' : '#ffffff', fontFamily: 'Georgia' },
    actionButton: { backgroundColor: '#0f5fff', borderRadius: 10, paddingVertical: 11, paddingHorizontal: 12, alignItems: 'center' },
    actionText: { color: '#ffffff', fontSize: 12, fontWeight: '900', fontFamily: 'Georgia' },
    repairEvidenceBox: { borderRadius: 10, borderWidth: 1, borderColor: dark ? '#26364a' : '#e6eef4', backgroundColor: dark ? '#111b24' : '#ffffff', padding: 10, gap: 8 },
    repairEvidencePreview: { width: '100%', height: 180, borderRadius: 10, borderWidth: 1, borderColor: dark ? '#334155' : '#dce3ea', objectFit: 'cover' },
    evidenceActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    repairCameraPanel: { borderRadius: 10, borderWidth: 1, borderColor: dark ? '#334155' : '#dce3ea', backgroundColor: dark ? '#030814' : '#f8fafc', padding: 10, gap: 8 },
    repairCameraPreview: { width: '100%', maxHeight: 260, borderRadius: 10, backgroundColor: '#000000' },
    balancePreview: { borderRadius: 10, borderWidth: 1, borderColor: dark ? '#26364a' : '#e6eef4', backgroundColor: dark ? '#111b24' : '#ffffff', padding: 10, gap: 3 },
    projectedText: { color: '#0f5fff', fontSize: 13, fontWeight: '900', fontFamily: 'Georgia' },
    captureButton: { backgroundColor: dark ? '#223044' : '#edf3ff', borderRadius: 10, borderWidth: 1, borderColor: dark ? '#334155' : '#dce3ea', paddingVertical: 11, paddingHorizontal: 12, alignItems: 'center' },
    captureButtonText: { color: dark ? '#f3f6fb' : '#0f5fff', fontSize: 12, fontWeight: '900', fontFamily: 'Georgia' },
    scanPreview: { width: '100%', height: 118, borderRadius: 10, borderWidth: 1, borderColor: dark ? '#334155' : '#dce3ea', backgroundColor: dark ? '#030814' : '#ffffff' },
    checkRow: { minHeight: 38, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 10, borderWidth: 1, borderColor: dark ? '#26364a' : '#e6eef4', backgroundColor: dark ? '#111b24' : '#ffffff' },
    checkRowActive: { backgroundColor: '#0f5fff', borderColor: '#0f5fff' },
    checkMark: { width: 34, color: '#0f5fff', fontWeight: '900', fontSize: 11, fontFamily: 'Georgia' },
    checkLabel: { flex: 1, color: dark ? '#f3f6fb' : '#0b1730', fontSize: 12, fontWeight: '800', fontFamily: 'Georgia' },
    checkTextActive: { color: '#ffffff' },
    excuseWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    excuseChip: { borderRadius: 999, borderWidth: 1, borderColor: dark ? '#26364a' : '#d8e3f7', backgroundColor: dark ? '#0f1720' : '#ffffff', paddingVertical: 9, paddingHorizontal: 12 },
    excuseText: { color: dark ? '#f3f6fb' : '#0b1730', fontSize: 12, fontWeight: '800', fontFamily: 'Georgia' },
    noteTimeline: { borderRadius: 12, borderWidth: 1, borderColor: dark ? '#26364a' : '#e6eef4', backgroundColor: dark ? '#0f1720' : '#f8fafc', padding: 12, gap: 8 },
    noteRow: { borderBottomWidth: 1, borderBottomColor: dark ? '#11264b' : '#e6eef4', paddingBottom: 8 },
    noteTitle: { color: dark ? '#f3f6fb' : '#0b1730', fontSize: 13, fontWeight: '900', fontFamily: 'Georgia', marginBottom: 3 },
    noteMeta: { color: '#0f5fff', fontSize: 11, fontWeight: '800', fontFamily: 'Georgia', marginTop: 4 },
    calendarHeader: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 10 },
    calendarMonth: { fontSize: 13, fontWeight: '700', color: dark ? '#f3f6fb' : '#0b1730', fontFamily: 'Georgia' },
    calendarNav: { display: 'none' },
    calendarNavText: { color: '#0f5fff', fontSize: 14, fontWeight: '700', fontFamily: 'Georgia' },
    dateSearchBar: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 10 },
    dateSearchInput: { width: 128, height: 36, borderRadius: 10, borderWidth: 1, borderColor: dark ? '#11264b' : '#dce3ea', backgroundColor: dark ? '#0f1720' : '#f8fafc', color: dark ? '#f3f6fb' : '#0b1730', paddingHorizontal: 10, fontSize: 12, fontWeight: '800', fontFamily: 'Georgia' },
    dateMiniButton: { width: 34, height: 34, borderRadius: 9, borderWidth: 1, borderColor: dark ? '#11264b' : '#dce3ea', backgroundColor: dark ? '#0f1720' : '#f4f8f7', alignItems: 'center', justifyContent: 'center' },
    dateMiniButtonText: { color: '#0f5fff', fontSize: 14, fontWeight: '900', fontFamily: 'Georgia' },
    todayButton: { height: 34, borderRadius: 9, backgroundColor: '#0f5fff', paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
    todayButtonText: { color: '#ffffff', fontSize: 12, fontWeight: '900', fontFamily: 'Georgia' },
    calendarGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start', gap: 4, marginBottom: 10 },
    calendarDayName: { width: '13%', textAlign: 'center', fontSize: 12, color: dark ? '#aebbd0' : '#627083', fontFamily: 'Georgia' },
    calendarDay: { width: '13%', minHeight: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: dark ? '#0f1720' : '#f4f8f7', borderWidth: 1, borderColor: dark ? '#11264b' : '#e6eef4', padding: 4 },
    calendarDaySelected: { borderColor: '#0f5fff', backgroundColor: dark ? '#102e62' : '#e7efff' },
    calendarDayDue: { borderColor: '#bd2a2a' },
    calendarDayPaid: { backgroundColor: dark ? '#10321d' : '#e6f7ed' },
    calendarDayNumber: { fontSize: 12, fontWeight: '800', color: dark ? '#f3f6fb' : '#0b1730', fontFamily: 'Georgia' },
    calendarBadge: { fontSize: 8, color: dark ? '#b8c3d7' : '#627083', textAlign: 'center', marginTop: 2, fontFamily: 'Georgia' },
    calendarDetail: { borderRadius: 12, borderWidth: 1, borderColor: dark ? '#11264b' : '#e6eef4', padding: 12, backgroundColor: dark ? '#0f1720' : '#f8fafc', marginBottom: 16 },
    calendarDetailTitle: { fontSize: 13, fontWeight: '700', color: dark ? '#f3f6fb' : '#0b1730', marginBottom: 6, fontFamily: 'Georgia' },
    calendarDetailText: { fontSize: 12, color: dark ? '#cbd5e1' : '#627083', fontFamily: 'Georgia', lineHeight: 18 },
    messageBox: { backgroundColor: dark ? '#0f1720' : '#f8fafc', borderRadius: 14, borderWidth: 1, borderColor: dark ? '#11264b' : '#e6eef4', padding: 14, marginBottom: 16 },
    messageInput: { minHeight: 80, borderRadius: 12, borderWidth: 1, borderColor: dark ? '#11264b' : '#dce3ea', backgroundColor: dark ? '#111b24' : '#ffffff', color: dark ? '#f3f6fb' : '#0b1730', padding: 12, fontFamily: 'Georgia', textAlignVertical: 'top' },
    messageButton: { backgroundColor: '#0f5fff', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, marginTop: 12, alignItems: 'center' },
    messageButtonText: { color: '#ffffff', fontWeight: '800', fontFamily: 'Georgia' },
    messageStatus: { marginTop: 10, color: dark ? '#aebbd0' : '#627083', fontSize: 12, fontFamily: 'Georgia' },
    progressBar: { height: 12, backgroundColor: dark ? '#0f1720' : '#ecf2f0', borderRadius: 999, overflow: 'hidden', marginTop: 12 },
    progressFill: { height: '100%', backgroundColor: '#0f5fff', borderRadius: 999 },
    progressSummaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
    progressCaption: { fontSize: 12, color: dark ? '#aebbd0' : '#627083', fontFamily: 'Georgia' },
    progressText: { color: dark ? '#f3f6fb' : '#0b1730', fontFamily: 'Georgia', fontWeight: '800', marginTop: 8 },
    paymentRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 12, gap: 10 },
    stackedBar: { flexDirection: 'row', height: 14, borderRadius: 999, overflow: 'hidden', marginTop: 10, backgroundColor: dark ? '#0b1316' : '#edf3ff', borderWidth: 1, borderColor: dark ? '#11264b' : '#e6eef3' },
    stackedSegment: { height: '100%' },
    depositSegment: { backgroundColor: '#1d7a5a' },
    paidSegment: { backgroundColor: '#2aa873' },
    remainingSegment: { backgroundColor: '#e9f3ee' },
    sparkline: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginTop: 10, paddingVertical: 6 },
    sparkBar: { width: 6, backgroundColor: '#0f5fff', borderRadius: 4, marginRight: 4 },
    quickOpenRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
    quickOpenButton: { borderRadius: 10, borderWidth: 1, borderColor: dark ? '#334155' : '#dce3ea', backgroundColor: dark ? '#0f1720' : '#f8fafc', paddingVertical: 9, paddingHorizontal: 10 },
    quickOpenText: { color: dark ? '#f3f6fb' : '#0f5fff', fontSize: 12, fontWeight: '900', fontFamily: 'Georgia' },
    metric: { minWidth: 118 },
    paymentLabel: { fontSize: 12, color: dark ? '#b8c3d7' : '#627083', fontFamily: 'Georgia' },
    paymentValue: { fontSize: 14, fontWeight: '800', color: dark ? '#f3f6fb' : '#0b1730', fontFamily: 'Georgia', marginTop: 3 },
    emptyText: { color: dark ? '#aebbd0' : '#627083', fontFamily: 'Georgia', padding: 20 },
    backButton: { alignSelf: 'flex-start', backgroundColor: dark ? '#223044' : '#edf3ff', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14, marginBottom: 14 },
    backText: { color: dark ? '#f3f6fb' : '#0f5fff', fontWeight: '800', fontFamily: 'Georgia' },
    detailLayout: { gap: 16 },
    mainPanel: { width: '100%', backgroundColor: dark ? '#092a75' : '#f5f8ff', borderRadius: 8, padding: 16, borderWidth: 1, borderColor: dark ? '#11264b' : '#e6eef3' },
    sidePanel: { width: '100%', backgroundColor: dark ? '#092a75' : '#f5f8ff', borderRadius: 8, padding: 16, borderWidth: 1, borderColor: dark ? '#11264b' : '#e6eef3' },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 12 },
    idCard: { backgroundColor: dark ? '#0f1720' : '#f4f8f7', borderRadius: 14, padding: 16, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 16, marginBottom: 16 },
    idLabel: { color: dark ? '#aebbd0' : '#627083', fontSize: 11, fontWeight: '800', fontFamily: 'Georgia' },
    idValue: { color: dark ? '#f3f6fb' : '#0b1730', fontSize: 20, fontWeight: '800', fontFamily: 'Georgia', marginVertical: 4 },
    profileGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    riderPhotoBox: { borderWidth: 1, borderColor: dark ? '#26364a' : '#d8e3f7', backgroundColor: dark ? '#111b24' : '#ffffff', borderRadius: 12, padding: 10, width: 150, gap: 8 },
    riderPhotoLarge: { width: 128, height: 128, borderRadius: 12, borderWidth: 1, borderColor: dark ? '#29406a' : '#dce3ea', backgroundColor: dark ? '#07101f' : '#edf3ff' },
    riderPhotoFallback: { width: 128, height: 128, borderRadius: 12, borderWidth: 1, borderColor: dark ? '#29406a' : '#dce3ea', backgroundColor: dark ? '#07101f' : '#edf3ff', alignItems: 'center', justifyContent: 'center' },
    riderPhotoInitial: { color: '#0f5fff', fontSize: 34, fontWeight: '900', fontFamily: 'Georgia' },
    infoBox: { flexGrow: 1, minWidth: 140, backgroundColor: dark ? '#0f1720' : '#f8fafc', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: dark ? '#26364a' : '#e8eef4', marginBottom: 10 },
    infoLabel: { color: dark ? '#b8c3d7' : '#627083', fontSize: 12, fontFamily: 'Georgia', marginBottom: 4 },
    infoValue: { color: dark ? '#f3f6fb' : '#0b1730', fontSize: 14, fontWeight: '800', fontFamily: 'Georgia' },
    riskHigh: { borderColor: '#bd2a2a' },
    riskMedium: { borderColor: '#b86800' },
    riskLow: { borderColor: '#6fe04e' },
    timeline: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    timelineItem: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: dark ? '#0f1720' : '#f4f8f7', borderRadius: 999, paddingVertical: 8, paddingHorizontal: 10 },
    timelineIndex: { color: '#ffffff', backgroundColor: '#0f5fff', width: 22, height: 22, borderRadius: 11, textAlign: 'center', lineHeight: 22, fontSize: 12, fontWeight: '800' },
    timelineText: { color: dark ? '#f3f6fb' : '#0b1730', fontFamily: 'Georgia', fontWeight: '700', fontSize: 12 },
    paymentSummary: { gap: 6 },
    transaction: { backgroundColor: dark ? '#0f1720' : '#f8fafc', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: dark ? '#26364a' : '#e8eef4', marginBottom: 12 },
    paymentForm: { gap: 10, marginBottom: 14 },
    transactionRow: { backgroundColor: dark ? '#0f1720' : '#ffffff', borderRadius: 12, borderWidth: 1, borderColor: dark ? '#11264b' : '#e6eef4', padding: 12, marginBottom: 10 },
    transactionDate: { fontSize: 12, color: dark ? '#aebbd0' : '#627083', marginBottom: 4, fontFamily: 'Georgia' },
    transactionText: { color: dark ? '#f3f6fb' : '#0b1730', fontWeight: '700', fontFamily: 'Georgia', marginBottom: 4 },
    error: { color: '#b42318', fontSize: 12, fontFamily: 'Georgia' },
  });
};
