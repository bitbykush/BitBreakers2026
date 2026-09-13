export type HumanActionType =
  | 'CAPTCHA'
  | 'MOBILE_OTP'
  | 'AADHAAR_OTP'
  | 'BIOMETRIC_RD'
  | 'BANK_MANDATE_AA'
  | 'FILE_UPLOAD_CONFIRM'
  | 'AMBIGUOUS_DECISION'
  | 'FINAL_DECLARATION'
  | 'LOGIN_CREDENTIALS'
  | 'MISSING_PROFILE_DATA'
  | 'NONE';

export type FieldMappingAction =
  | 'AUTO_FILL'
  | 'AUTO_SELECT'
  | 'AUTO_CHECK'
  | 'HUMAN_INPUT_REQUIRED'
  | 'UNMATCHED';

export interface FormFieldOption {
  value: string;
  label: string;
}

export interface FormFieldDescriptor {
  field_id: string;
  name?: string;
  label: string;
  placeholder?: string;
  aria_label?: string;
  tag_name: string;
  input_type?: string;
  options?: FormFieldOption[];
  is_required?: boolean;
  page_section?: string;
}

export interface FieldMappingResult {
  field_id: string;
  action: FieldMappingAction;
  suggested_value?: any;
  display_value?: string;
  confidence: number;
  matched_profile_field?: string;
  requires_human: boolean;
  human_action_type: HumanActionType;
  human_prompt_message_en?: string;
  human_prompt_message_hi?: string;
  match_reason?: string;
}

export interface FormMatchingResponse {
  target_portal: string;
  total_fields: number;
  auto_fillable_fields: number;
  human_action_fields: number;
  unmatched_fields: number;
  automation_coverage_pct: number;
  mappings: FieldMappingResult[];
  execution_time_ms: number;
  engine: string;
}

export interface JanSamarthTemplateResponse {
  portal_name: string;
  portal_url: string;
  supported_schemes: string[];
  total_fields: number;
  fields: FormFieldDescriptor[];
}
