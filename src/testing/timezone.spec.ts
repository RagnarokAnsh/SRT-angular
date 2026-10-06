describe('test environment', () => {
  it('runs in India Standard Time (UTC+5:30) so date-shift bugs are caught', () => {
    expect(new Date(2020, 4, 10).getTimezoneOffset()).toBe(-330);
  });
});
