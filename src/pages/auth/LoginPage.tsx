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

  useEffect(() => {
    if (!authLoading && user) {
      navigate(redirect, { replace: true })
    }
  }, [user, authLoading, navigate, redirect])

  function onSuccess() {
    navigate(redirect, { replace: true })
  }

  async function handleGoogle() {
    setGoogleError('')
    setGoogleLoading(true)
    try {
      await signInWithGoogle()
      onSuccess()
    } catch {
      setGoogleError('Google sign-in failed. Please try again.')
      setGoogleLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center p-6 overflow-hidden bg-slate-50 animate-fade-in">
      {/* Subtle Background Accent */}
      <div className="absolute top-0 right-0 h-[500px] w-[500px] bg-primary/5 rounded-full blur-[100px] -mr-32 -mt-32" />
      <div className="absolute bottom-0 left-0 h-[500px] w-[500px] bg-primary/5 rounded-full blur-[100px] -ml-32 -mb-32" />

      <div className="w-full max-w-sm space-y-8 relative z-10 animate-slide-up">
        {/* Logo Section */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="p-3 rounded-2xl premium-gradient shadow-lg shadow-primary/10 transition-transform hover:scale-105 duration-300">
            <Plane className="h-6 w-6 text-white" />
          </div>
          <div className="space-y-0.5">
            <h1 className="text-3xl font-black tracking-tight text-slate-900">
              TripSync
            </h1>
            <p className="text-muted-foreground font-medium text-sm">
              Plan your next escape, together.
            </p>
          </div>
        </div>

        <Card className="glass border-white/40 rounded-2xl shadow-xl overflow-hidden p-0">
          <CardHeader className="pt-8 pb-4 px-6 text-center">
            <CardTitle className="text-xl font-black tracking-tight">Welcome back</CardTitle>
            <CardDescription className="text-muted-foreground/80 font-medium text-xs">
              Join your squad and start planning.
            </CardDescription>
          </CardHeader>

          <CardContent className="px-6 pb-8 space-y-6">
            <Button
              variant="outline"
              className="w-full h-11 rounded-xl border border-primary/10 font-bold transition-all hover:bg-slate-50"
              onClick={handleGoogle}
              disabled={googleLoading}
            >
              <GoogleIcon />
              <span className="ml-2.5 text-xs">
                {googleLoading ? 'Connecting…' : 'Continue with Google'}
              </span>
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-200/60" />
              </div>
              <div className="relative flex justify-center text-[9px] uppercase tracking-[0.2em] font-black text-muted-foreground/60">
                <span className="bg-white px-3 rounded-full py-0.5">or</span>
              </div>
            </div>

            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2 p-1 glass rounded-xl h-11 mb-6">
                <TabsTrigger value="signin" className="rounded-lg font-bold text-xs data-[state=active]:shadow-sm">Sign in</TabsTrigger>
                <TabsTrigger value="signup" className="rounded-lg font-bold text-xs data-[state=active]:shadow-sm">Create</TabsTrigger>
              </TabsList>

              <TabsContent value="signin" className="focus-visible:outline-none">
                <SignInForm onSuccess={onSuccess} />
              </TabsContent>
              <TabsContent value="signup" className="focus-visible:outline-none">
                <SignUpForm onSuccess={onSuccess} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {googleError && (
          <p className="text-xs font-bold text-destructive bg-destructive/5 px-4 py-2.5 rounded-xl text-center border border-destructive/10 animate-fade-in">
            {googleError}
          </p>
        )}
      </div>
    </div>
  )
}
