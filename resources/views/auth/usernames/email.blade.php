@extends('layouts.auth')

@section('title', 'Recover your username')

@section('content')
    <div class="auth-shell">
        <div class="auth-grid">
            <div>
                @include('auth.partials.brand')
                @include('auth.partials.aside')
            </div>

            <div>
                <div class="auth-panel">
                    <div class="auth-panel-header">
                        <h1 class="auth-title">Recover your username</h1>
                        <p class="auth-subtitle">We&apos;ll send your sign-in username to the inbox already attached to your VovaMail account.</p>
                    </div>

                    <form method="POST" action="{{ route('username.email') }}">
                        @csrf

                        @if (session('status'))
                            <div class="auth-alert auth-alert-success" role="alert">
                                {{ session('status') }}
                            </div>
                        @endif

                        <div class="auth-input-group">
                            <label for="email" class="auth-label">Email address</label>
                            <input id="email" type="text" class="auth-input{{ $errors->has('email') ? ' border-red-500' : '' }}" name="email" value="{{ old('email') }}" placeholder="johndoe@example.com" required>

                            @if ($errors->has('email'))
                                <p class="auth-error">{{ $errors->first('email') }}</p>
                            @endif
                        </div>

                        <div class="mb-6">
                            <label for="captcha" class="auth-label">Human verification</label>
                            <div class="flex gap-2">
                                <img src="{{ captcha_src('mini') }}" onclick="this.src='/captcha/mini?'+Math.random()" class="h-12 w-16 shrink-0 cursor-pointer rounded border border-grey-700" title="Click to refresh image" alt="captcha">
                                <input id="captcha" type="text" class="auth-input flex-1{{ $errors->has('captcha') ? ' border-red-500' : '' }}" name="captcha" placeholder="Enter the text you see" required>
                            </div>
                            <p class="auth-help">Click the image if you need a fresh challenge.</p>

                            @if ($errors->has('captcha'))
                                <p class="auth-error">{{ $errors->first('captcha') }}</p>
                            @endif
                        </div>

                        @if (Route::has('password.request'))
                            <a class="auth-link" href="{{ route('password.request') }}">Forgot password?</a>
                        @endif

                        <button type="submit" class="auth-button mt-4">
                            Send reminder
                        </button>
                    </form>
                </div>

                <p class="auth-footer text-center lg:text-left">
                    <a class="auth-link" href="{{ route('login') }}">Back to sign in</a>
                </p>
            </div>
        </div>
    </div>
@endsection
