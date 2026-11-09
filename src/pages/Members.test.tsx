import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { fakeApi, sampleStore } from '../test/fakeApi';
import { renderWithApi } from '../test/render';
import { Members } from './Members';

describe('Members', () => {
  it('owner can grant manager, cashier, staff — never owner', async () => {
    renderWithApi(<Members store={sampleStore} currentUserId="u-owner" />, fakeApi());
    const roleSelect = screen.getByLabelText('Peran');
    const options = within(roleSelect).getAllByRole('option').map((o) => o.textContent);
    expect(options).toEqual(['Manajer', 'Kasir', 'Staf']);
    await screen.findByText('maya@test.id');
    // Owner row (self) has no remove button; others do.
    expect(screen.queryByRole('button', { name: 'Keluarkan Ani' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Keluarkan Maya' })).toBeInTheDocument();
  });

  it('manager can only grant cashier/staff and cannot change roles or remove managers', async () => {
    renderWithApi(<Members store={{ ...sampleStore, role: 'manager' }} currentUserId="u-mgr" />, fakeApi());
    const options = within(screen.getByLabelText('Peran')).getAllByRole('option').map((o) => o.textContent);
    expect(options).toEqual(['Kasir', 'Staf']);
    await screen.findByText('citra@test.id');
    expect(screen.queryByLabelText(/^Peran Citra/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Keluarkan Citra' })).toBeInTheDocument();
  });

  it('adds a member and reloads the list', async () => {
    const api = fakeApi();
    renderWithApi(<Members store={sampleStore} currentUserId="u-owner" />, api);
    await userEvent.type(screen.getByLabelText('Email anggota'), 'Baru@Test.id');
    await userEvent.click(screen.getByRole('button', { name: 'Tambah' }));
    expect(api.addMember).toHaveBeenCalledWith('store-1', 'baru@test.id', 'cashier');
    expect(await screen.findByText(/ditambahkan sebagai Kasir/)).toBeInTheDocument();
    expect(api.listMembers).toHaveBeenCalledTimes(2);
  });

  it('shows the server reason when adding fails', async () => {
    const api = fakeApi({ addMember: vi.fn(async () => { throw new Error('USER_NOT_FOUND'); }) });
    renderWithApi(<Members store={sampleStore} currentUserId="u-owner" />, api);
    await userEvent.type(screen.getByLabelText('Email anggota'), 'x@test.id');
    await userEvent.click(screen.getByRole('button', { name: 'Tambah' }));
    expect(await screen.findByText(/Email belum terdaftar/)).toBeInTheDocument();
  });

  it('changes a role via the server', async () => {
    const api = fakeApi();
    renderWithApi(<Members store={sampleStore} currentUserId="u-owner" />, api);
    await userEvent.selectOptions(await screen.findByLabelText('Peran Citra'), 'staff');
    expect(api.updateMemberRole).toHaveBeenCalledWith('m-cash', 'staff');
  });

  it('shows empty and error states', async () => {
    const { unmount } = renderWithApi(<Members store={sampleStore} currentUserId="u-owner" />, fakeApi({ listMembers: vi.fn(async () => []) }));
    expect(await screen.findByText('Belum ada anggota.')).toBeInTheDocument();
    unmount();
    renderWithApi(<Members store={sampleStore} currentUserId="u-owner" />, fakeApi({ listMembers: vi.fn(async () => { throw new Error('FORBIDDEN'); }) }));
    expect(await screen.findByText(/tidak memiliki izin/)).toBeInTheDocument();
  });
});
