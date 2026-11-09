import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { ApiProvider } from '../data/ApiContext';
import type { Api } from '../data/types';

export function renderWithApi(ui: ReactElement, api: Api) {
  return render(<ApiProvider api={api}>{ui}</ApiProvider>);
}
