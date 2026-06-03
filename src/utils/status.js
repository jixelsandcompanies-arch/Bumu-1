import { colors } from '../theme/colors.js';

export function getStatusTone(status) {
  if (['active', 'paid', 'matched', 'complete'].includes(status)) {
    return { backgroundColor: colors.successSoft, color: colors.success, borderColor: '#b9e5d1' };
  }

  if (['pending', 'pending_assignment', 'earned', 'amount_mismatch', 'follow_up', 'processing'].includes(status)) {
    return { backgroundColor: colors.warningSoft, color: colors.warning, borderColor: '#f0d695' };
  }

  if (['unpaid', 'timeout', 'defaulted', 'cancelled', 'unmatched', 'locked', 'failed'].includes(status)) {
    return { backgroundColor: colors.dangerSoft, color: colors.danger, borderColor: '#f1b6b6' };
  }

  return { backgroundColor: colors.primarySoft, color: colors.primary, borderColor: '#bdd4f7' };
}

export function humanizeStatus(status) {
  return status.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}
