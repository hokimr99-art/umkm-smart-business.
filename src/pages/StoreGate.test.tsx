import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeApi, sampleStore } from '../test/fakeApi';
import { renderWithApi } from '../test/render';
import { StoreGate } from './StoreGate';

const user = { id: 'u-owner', email: 'ani@test.id' };

describe('StoreGate', () => {
  beforeEach(() => window.localStorage.clear());

  it('shows loading, then onboarding when the user has no store', async () => {
    const api = fakeApi({ listMyStores: vi.fn(async () => []) });
    renderWithApi(<StoreGate user={user} />, api);
    expect(screen.getByText('Memuat toko…')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Buat toko / usaha' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Batal' })).not.toBeInTheDocument();
  });

  it('auto-generates the store address and creates the store', async () => {
    const created = { ...sampleStore, id: 'store-new', name: 'Kopi Ñusa' };
    const listMyStores = vi.fn().mockResolvedValueOnce([]).mockResolvedValue([created]);
    const api = fakeApi({ listMyStores });
    renderWithApi(<StoreGate user={user} />, api);
    await userEvent.type(await screen.findByLabelText('Nama usaha'), 'Kopi Ñusa');
    expect(screen.getByLabelText('Alamat toko')).toHaveValue('kopi-nusa');
    await userEvent.click(screen.getByRole('button', { name: 'Buat toko' }));
    expect(api.createStore).toHaveBeenCalledWith('Kopi Ñusa', 'kopi-nusa', null);
    expect(await screen.findByRole('heading', { name: 'Kopi Ñusa' })).toBeInTheDocument();
  });

  it('shows a retryable error state', async () => {
    const listMyStores = vi.fn().mockRejectedValueOnce(new TypeError('Failed to fetch')).mockResolvedValue([sampleStore]);
    renderWithApi(<StoreGate user={user} />, fakeApi({ listMyStores }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/koneksi internet/);
    await userEvent.click(screen.getByRole('button', { name: 'Coba lagi' }));
    expect(await screen.findByRole('heading', { name: 'Martabak Ani' })).toBeInTheDocument();
  });

  it('asks to pick when there are several stores and no remembered choice', async () => {
    const other = { ...sampleStore, id: 'store-2', name: 'Warung Budi', role: 'cashier' as const };
    renderWithApi(<StoreGate user={user} />, fakeApi({ listMyStores: vi.fn(async () => [sampleStore, other]) }));
    await userEvent.click(await screen.findByRole('button', { name: /Warung Budi/ }));
    expect(screen.getByRole('heading', { name: 'Warung Budi' })).toBeInTheDocument();
    expect(screen.getByText(/Peran Anda: Kasir/)).toBeInTheDocument();
  });

  it('hides Tim and Toko tabs from a cashier', async () => {
    renderWithApi(<StoreGate user={user} />, fakeApi({ listMyStores: vi.fn(async () => [{ ...sampleStore, role: 'cashier' as const }]) }));
    await screen.findByRole('heading', { name: 'Martabak Ani' });
    const nav = screen.getByRole('navigation', { name: 'Menu utama' });
    expect(nav).toHaveTextContent('Beranda');
    expect(nav).not.toHaveTextContent('Tim');
    expect(nav).not.toHaveTextContent('Toko');
  });
});
