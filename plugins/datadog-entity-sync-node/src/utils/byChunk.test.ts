import { byChunkAsync } from './byChunk';
import { promiseDelay } from './promiseDelay';

jest.mock('./promiseDelay');

const mockedPromiseDelay = promiseDelay as jest.Mock<
  ReturnType<typeof promiseDelay>
>;

describe('Utility Functions', () => {
  describe('byChunkAsync', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    test('should process an array in chunks and at an interval', async () => {
      async function* process(items: { id: number }[]) {
        await promiseDelay({ milliseconds: 1 });

        for (const item of items) {
          yield { ...item, process: 'acted' };
        }
      }

      const COUNT = 34;
      const AMOUNT = 97;
      const CHUNKS_COUNT = Math.ceil(AMOUNT / COUNT);
      // there will be one less than chunks due to it skipping for the last one.
      const RATE_LIMIT_WAITS = CHUNKS_COUNT - 1;
      const PROCESSES_WAITS = CHUNKS_COUNT;
      const TOTAL_WAITS = RATE_LIMIT_WAITS + PROCESSES_WAITS;

      const exampleItems = [...Array<unknown>(AMOUNT)].map((_, index) => ({
        id: index + 1,
      }));

      const syncedServices = await byChunkAsync(
        exampleItems,
        { count: COUNT, interval: { seconds: 1 } },
        chunk => process(chunk),
      );

      expect(syncedServices).toEqual(
        exampleItems.map(item => ({ ...item, process: 'acted' })),
      );
      expect(mockedPromiseDelay).toHaveBeenCalledTimes(TOTAL_WAITS);
    });
  });
});
