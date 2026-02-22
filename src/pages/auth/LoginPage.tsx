import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plane } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { signInWithGoogle, signInWithEmail, signUpWithEmail } from '@/services/auth'
import { useAuthStore } from '@/stores/authStore'

// ─── Schemas ──────────────────────────────────────────────────────────────────

const signInSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

const signUpSchema = signInSchema.extend({
  displayName: z.string().min(2, 'Name must be at least 2 characters'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
})

type SignInValues = z.infer<typeof signInSchema>
type SignUpValues = z.infer<typeof signUpSchema>

// ─── Google button ────────────────────────────────────────────────────────────

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  )
}

// ─── Sign-in form ─────────────────────────────────────────────────────────────

function SignInForm({ onSuccess }: { onSuccess: () => void }) {
  const [error, setError] = useState('')
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInValues>({ resolver: zodResolver(signInSchema) })

  async function onSubmit(values: SignInValues) {
    setError('')
    try {
      await signInWithEmail(values.email, values.password)
      onSuccess()
    } catch (err: unknown) {
      const code = (err as { code?: string }).code
      if (code === 'auth/invalid-credential' || code === 'auth/wrong-password') {
        setError('Invalid email or password.')
      } else if (code === 'auth/user-not-found') {
        setError('No account found with that email.')
      } else {
        setError('Something went wrong. Please try again.')
      }
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="signin-email">Email</Label>
        <Input id="signin-email" type="email" placeholder="you@example.com" {...register('email')} />
        {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
      </div>

      <div className="space-y-1">
        <Label htmlFor="signin-password">Password</Label>
        <Input id="signin-password" type="password" placeholder="••••••••" {...register('password')} />
        {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  )
}

// ─── Sign-up form ─────────────────────────────────────────────────────────────

function SignUpForm({ onSuccess }: { onSuccess: () => void }) {
  const [error, setError] = useState('')
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignUpValues>({ resolver: zodResolver(signUpSchema) })

  async function onSubmit(values: SignUpValues) {
    setError('')
    try {
      await signUpWithEmail(values.email, values.password, values.displayName)
      onSuccess()
    } catch (err: unknown) {
      const code = (err as { code?: string }).code
      if (code === 'auth/email-already-in-use') {
        setError('An account already exists with that email.')
      } else {
        setError('Something went wrong. Please try again.')
      }
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="signup-name">Full name</Label>
        <Input id="signup-name" placeholder="Alex Smith" {...register('displayName')} />
        {errors.displayName && <p className="text-xs text-destructive">{errors.displayName.message}</p>}
      </div>

      <div className="space-y-1">
        <Label htmlFor="signup-email">Email</Label>
        <Input id="signup-email" type="email" placeholder="you@example.com" {...register('email')} />
        {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
      </div>

      <div className="space-y-1">
        <Label htmlFor="signup-password">Password</Label>
        <Input id="signup-password" type="password" placeholder="••••••••" {...register('password')} />
        {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
      </div>

      <div className="space-y-1">
        <Label htmlFor="signup-confirm">Confirm password</Label>
        <Input id="signup-confirm" type="password" placeholder="••••••••" {...register('confirmPassword')} />
        {errors.confirmPassword && (
          <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Creating account…' : 'Create account'}
      </Button>
    </form>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [googleError, setGoogleError] = useState('')
  const [googleLoading, setGoogleLoading] = useState(false)
  const user = useAuthStore((s) => s.user)
  const authLoading = useAuthStore((s) => s.loading)

  const redirect = searchParams.get('redirect') ?? '/trips'

  // Handle Google redirect flow — when the user returns from Google OAuth,
  // onAuthStateChanged sets the user; navigate to the redirect target.
  // sessionStorage preserves the redirect target across the full-page OAuth redirect.
  useEffect(() => {
    if (!authLoading && user) {
      const target = sessionStorage.getItem('postAuthRedirect') || redirect
      sessionStorage.removeItem('postAuthRedirect')
      navigate(target, { replace: true })
    }
  }, [user, authLoading, navigate, redirect])

  function onSuccess() {
    navigate(redirect, { replace: true })
  }

  async function handleGoogle() {
    setGoogleError('')
    setGoogleLoading(true)
    // Save redirect target before navigating away — the OAuth redirect clears URL params
    sessionStorage.setItem('postAuthRedirect', redirect)
    try {
      // signInWithGoogle uses redirect — browser navigates away, no return value
      await signInWithGoogle()
    } catch {
      sessionStorage.removeItem('postAuthRedirect')
      setGoogleError('Google sign-in failed. Please try again.')
      setGoogleLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Plane className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">TripSync</h1>
          <p className="text-sm text-muted-foreground">Plan trips together, stress-free</p>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Welcome</CardTitle>
            <CardDescription>Sign in to your account or create a new one</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Google */}
            <Button
              variant="outline"
              className="w-full"
              onClick={handleGoogle}
              disabled={googleLoading}
            >
              <GoogleIcon />
              {googleLoading ? 'Connecting…' : 'Continue with Google'}
            </Button>

            {googleError && <p className="text-sm text-destructive text-center">{googleError}</p>}

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">or</span>
              </div>
            </div>

            {/* Email tabs */}
            <Tabs defaultValue="signin">
              <TabsList className="w-full">
                <TabsTrigger value="signin" className="flex-1">Sign in</TabsTrigger>
                <TabsTrigger value="signup" className="flex-1">Create account</TabsTrigger>
              </TabsList>
              <TabsContent value="signin" className="pt-4">
                <SignInForm onSuccess={onSuccess} />
              </TabsContent>
              <TabsContent value="signup" className="pt-4">
                <SignUpForm onSuccess={onSuccess} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
