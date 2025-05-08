import { render, waitFor } from '@testing-library/react';

import App from './App';

describe('App', () => {
  it('should render', async () => {
    process.env = {
      NODE_ENV: 'test',
      // https://github.com/backstage/backstage/blob/6e362e6fa7549469d8d92fe5638fb53b54d23be1/packages/app/src/App.test.tsx#L24-L41
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      APP_CONFIG: [
        {
          data: {
            app: { title: 'Test' },
            backend: { baseUrl: 'http://localhost:7007' },
            techdocs: {
              storageUrl: 'http://localhost:7007/api/techdocs/static/docs',
            },
          },
          context: 'test',
        },
        // https://github.com/backstage/backstage/blob/6e362e6fa7549469d8d92fe5638fb53b54d23be1/packages/app/src/App.test.tsx#L24-L41
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ] as any,
    };

    const rendered = render(<App />);

    await waitFor(() => {
      expect(rendered.baseElement).toBeInTheDocument();
    });
  });
});
