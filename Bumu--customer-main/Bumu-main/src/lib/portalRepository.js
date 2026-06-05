import { requireSupabase, supabase, isSupabaseConfigured } from './supabaseClient';

export { isSupabaseConfigured };

export const getCurrentAgent = async () => {
  const client = requireSupabase();
  const { data: { user }, error: userError } = await client.auth.getUser();
  if (userError) throw userError;
  if (!user) return null;

  const { data, error } = await client
    .from('agents')
    .select('*')
    .eq('auth_user_id', user.id)
    .maybeSingle();
  if (error) throw error;
  return data;
};

export const listAssignedContracts = async () => {
  const client = requireSupabase();
  const { data, error } = await client
    .from('rider_contracts')
    .select(`
      *,
      rider_identity:rider_identities(*),
      verification_checklists(*),
      repair_debt_requests(*),
      agent_tasks(*)
    `)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
};

export const createAgentTask = async ({ contractId, agentId, title, note, dueLabel = 'Today' }) => {
  const client = requireSupabase();
  const { data, error } = await client
    .from('agent_tasks')
    .insert({
      contract_id: contractId,
      agent_id: agentId,
      title,
      note,
      due_label: dueLabel,
      status: 'open',
    })
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const completeAgentTask = async (taskId) => {
  const client = requireSupabase();
  const { data, error } = await client
    .from('agent_tasks')
    .update({ status: 'done', completed_at: new Date().toISOString() })
    .eq('id', taskId)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const createNextOfKinConsent = async ({
  contractId,
  agentId,
  kinName,
  kinPhone,
  relationship,
  otpReference,
  otpVerified,
  consentStatus,
}) => {
  const client = requireSupabase();
  const { data, error } = await client
    .from('next_of_kin_consents')
    .insert({
      contract_id: contractId,
      agent_id: agentId,
      kin_name: kinName,
      kin_phone: kinPhone,
      relationship,
      otp_reference: otpReference,
      otp_verified: otpVerified,
      consent_status: consentStatus,
      consented_at: otpVerified && consentStatus === 'yes' ? new Date().toISOString() : null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const createCustomerPhoneVerification = async ({
  contractId = null,
  agentId,
  riderPhone,
  otpReference,
  otpVerified,
}) => {
  const client = requireSupabase();
  const { data, error } = await client
    .from('customer_phone_verifications')
    .insert({
      contract_id: contractId,
      agent_id: agentId,
      rider_phone: riderPhone,
      otp_reference: otpReference,
      otp_verified: otpVerified,
      verified_at: otpVerified ? new Date().toISOString() : null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const createBackOfficeScreeningQueueItem = async ({
  queueReference,
  contractId,
  agentId,
  notes = '',
}) => {
  const client = requireSupabase();
  const { data, error } = await client
    .from('back_office_screening_queue')
    .insert({
      queue_reference: queueReference,
      contract_id: contractId,
      submitted_by_agent_id: agentId,
      status: 'queued',
      notes,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const uploadPortalPhoto = async ({ bucket = 'rider-documents', path, file }) => {
  const client = requireSupabase();
  const { data, error } = await client.storage
    .from(bucket)
    .upload(path, file, { upsert: true, contentType: file.type || 'image/jpeg' });
  if (error) throw error;
  return data;
};

export const createRepairDebtRequest = async ({
  contractId,
  agentId,
  damageDescription,
  requestedAmount,
  evidenceFileName,
  evidenceStoragePath,
  evidencePreviewUrl,
  evidenceCaptureMethod,
}) => {
  const client = requireSupabase();
  const { data, error } = await client
    .from('repair_debt_requests')
    .insert({
      contract_id: contractId,
      agent_id: agentId,
      damage_description: damageDescription,
      requested_amount: requestedAmount,
      evidence_file_name: evidenceFileName,
      evidence_storage_path: evidenceStoragePath,
      evidence_preview_url: evidencePreviewUrl,
      evidence_capture_method: evidenceCaptureMethod,
      status: 'pending_approval',
    })
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const signOut = async () => {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};
