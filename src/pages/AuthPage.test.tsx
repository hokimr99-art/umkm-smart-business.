import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { fakeApi } from '../test/fakeApi';
import { renderWithApi } from '../test/render';
import { AuthPage } from './AuthPage';

describe('AuthPage', () => {
  it('validates before calling the server', async () => {
    const api = fakeApi();
    renderWithApi(<AuthPage />, api);
    await userEvent.click(screen.getByRole('button', { name: 'Masuk' }));
    expect(screen.getByText('Email wajib diisi.')).toBeInTheDocument();
    expect(screen.getByText('Kata sandi wajib diisi.')).toBeInTheDocument();
    expect(api.signIn).not.toHaveBeenCalled();
  });

  it('signs in with normalized email and shows mapped server error', async () => {
    const api = fakeApi({ signIn: vi.fn(async () => { throw new Error('Invalid login credentials'); }) });
    renderWithApi(<AuthPage />, api);
    await userEvent.type(screen.getByLabelText('Email'), '  Ani@Toko.ID ');
    await userEvent.type(screen.getByLabelText('Kata sandi'), 'rahasia123');
    await userEvent.click(screen.getByRole('button', { name: 'Masuk' }));
    expect(api.signIn).toHaveBeenCalledWith('ani@toko.id', 'rahasia123');
    expect(await screen.findByRole('alert')).toHaveTextContent('Email atau kata sandi salah.');
  });

  it('registers and asks for email confirmation', async () => {
    const api = fakeApi();
    renderWithApi(<AuthPage />, api);
    await userEvent.click(screen.getByRole('button', { name: /Daftar/ }));
    await userEvent.type(screen.getByLabelText('Nama lengkap'), 'Ani Wijaya');
    await userEvent.type(screen.getByLabelText('Email'), 'ani@toko.id');
    await userEvent.type(screen.getByLabelText('Kata sandi'), 'lemah');
    await userEvent.click(screen.getByRole('button', { name: 'Daftar' }));
    expect(screen.getByText('Kata sandi minimal 8 karakter.')).toBeInTheDocument();
    expect(api.signUp).not.toHaveBeenCalled();

    await userEvent.clear(screen.getByLabelText('Kata sandi'));
    await userEvent.type(screen.getByLabelText('Kata sandi'), 'rahasia123');
    await userEvent.click(screen.getByRole('button', { name: 'Daftar' }));
    expect(api.signUp).toHaveBeenCalledWith('ani@toko.id', 'rahasia123', 'Ani Wijaya');
    expect(await screen.findByText(/Cek email Anda/)).toBeInTheDocument();
  });

  it('password reset shows the same message regardless of account existence', async () => {
    const api = fakeApi();
    renderWithApi(<AuthPage />, api);
    await userEvent.click(screen.getByRole('button', { name: 'Lupa kata sandi?' }));
    await userEvent.type(screen.getByLabelText('Email'), 'siapa@saja.id');
    await userEvent.click(screen.getByRole('button', { name: 'Kirim tautan' }));
    expect(api.requestPasswordReset).toHaveBeenCalledWith('siapa@saja.id');
    expect(await screen.findByText(/Jika email terdaftar/)).toBeInTheDocument();
  });
});
