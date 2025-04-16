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
      async function* process(items: Array<{ id: number }>) {
        await promiseDelay({ milliseconds: 1 });

        for (const item of items) {
          yield { ...item, process: 'acted' };
        }
      }

      const COUNT = 7;
      const AMOUNT = 37;

      const exampleItems = [...Array(AMOUNT)].map((_, index) => ({
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

      expect(mockedPromiseDelay).toHaveBeenCalledTimes(
        2 * Math.ceil(AMOUNT / COUNT) - 1,
      );
    });
  });
});
