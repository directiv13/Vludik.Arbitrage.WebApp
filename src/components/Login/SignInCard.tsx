import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';

interface SignInCardProps {
  signingIn: boolean;
  error: string | null;
  onSuccess: (credentialResponse: CredentialResponse) => void;
  onError: () => void;
}

/**
 * Sign-in card (right panel) of the /login screen. Ported from design/Login.dc.html,
 * with the export's custom Google button replaced by @react-oauth/google's native
 * <GoogleLogin> (styled via its own theme/shape props to approximate the export).
 */
export function SignInCard({ signingIn, error, onSuccess, onError }: SignInCardProps) {
  return (
    <div className="flex w-[520px] flex-none flex-col items-center justify-center bg-bg p-11">
      <div className="w-full max-w-[352px] animate-[arbor-rise_.5s_cubic-bezier(.4,0,.2,1)_both]">
        <div className="mb-[30px]">
          <h2 className="m-0 mb-2 text-[23px] font-semibold tracking-[-0.01em]">
            Sign in to Arbor
          </h2>
          <p className="m-0 text-[13.5px] leading-[1.5] text-tx2">
            Use your Google account to access the trading terminal.
          </p>
        </div>

        <div className="flex justify-center">
          <GoogleLogin
            onSuccess={onSuccess}
            onError={onError}
            theme="outline"
            logo_alignment="center"
            size="large"
            text="continue_with"
            width={352}
          />
        </div>

        {signingIn && (
          <div className="mt-4 flex items-center justify-center gap-2 text-[12.5px] text-tx2">
            <span className="inline-block h-[13px] w-[13px] animate-[arbor-spin_.8s_linear_infinite] rounded-full border-2 border-bd border-t-brand" />
            Redirecting to Google…
          </div>
        )}

        {error && (
          <p className="mt-3 text-center text-[12.5px] text-red">{error}</p>
        )}

        {/* divider */}
        <div className="my-[26px] flex items-center gap-3">
          <div className="h-px flex-1 bg-bd2" />
          <span className="text-[10.5px] tracking-[0.06em] text-tx3 uppercase">
            Secured access
          </span>
          <div className="h-px flex-1 bg-bd2" />
        </div>

        {/* trust row */}
        <div className="flex flex-col gap-[11px]">
          <div className="flex items-center gap-[10px] text-[12.5px] text-tx2">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="flex-none stroke-grn">
              <path
                d="M12 3l7 3v5c0 4.4-3 7.7-7 9-4-1.3-7-4.6-7-9V6l7-3z"
                strokeWidth="1.7"
                strokeLinejoin="round"
              />
              <path
                d="M9 12l2 2 4-4"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Exchange API keys are encrypted and never leave your vault.
          </div>
          <div className="flex items-center gap-[10px] text-[12.5px] text-tx2">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="flex-none stroke-brand">
              <rect x="5" y="11" width="14" height="9" rx="2" strokeWidth="1.7" />
              <path d="M8 11V8a4 4 0 018 0v3" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
            Google OAuth with 2-step verification enforced.
          </div>
        </div>

        {/* legal */}
        <p className="m-0 mt-7 text-[11.5px] leading-[1.6] text-tx3">
          By continuing you agree to Arbor&apos;s{' '}
          <a href="#terms" className="text-tx2 underline underline-offset-2">
            Terms of Service
          </a>{' '}
          and{' '}
          <a href="#privacy" className="text-tx2 underline underline-offset-2">
            Privacy Policy
          </a>
          . Trading derivatives carries risk of loss.
        </p>
      </div>

      <div className="mt-[34px] text-xs text-tx3">
        New to Arbor?{' '}
        <a href="#request" className="font-medium text-brand no-underline">
          Request access
        </a>
      </div>
    </div>
  );
}
