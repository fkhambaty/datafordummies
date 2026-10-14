import { decideNavigation, siteUrl, sitePathOf } from '../src/lib/url-policy';

describe('siteUrl', () => {
  it('builds datafordummies.in URLs from site paths', () => {
    expect(siteUrl('snowflake_course/hub.html')).toBe('https://datafordummies.in/snowflake_course/hub.html');
    expect(siteUrl('/privacy.html')).toBe('https://datafordummies.in/privacy.html');
    expect(siteUrl('interviews/index.html#q2')).toBe('https://datafordummies.in/interviews/index.html#q2');
  });

  it.each([
    '',
    '   ',
    '//evil.example/page.html',
    'https://evil.example/',
    'javascript:alert(1)',
    'data:text/html,hi',
    'file:///etc/passwd',
    '\\\\evil.example',
    'lesson.html\nhttps://evil.example',
  ])('refuses %p', (path) => {
    expect(siteUrl(path)).toBeNull();
  });

  it('keeps dot segments on the site origin', () => {
    expect(siteUrl('../../index.html')).toBe('https://datafordummies.in/index.html');
  });
});

describe('sitePathOf', () => {
  it('accepts only https site hosts', () => {
    expect(sitePathOf('https://www.datafordummies.in/python_course/s1-intro.html')).toBe('python_course/s1-intro.html');
    expect(sitePathOf('http://datafordummies.in/index.html')).toBeNull();
    expect(sitePathOf('https://datafordummies.in.evil.example/')).toBeNull();
    expect(sitePathOf('not a url')).toBeNull();
  });
});

describe('decideNavigation', () => {
  it('loads lesson pages on both site hosts', () => {
    expect(decideNavigation('https://datafordummies.in/snowflake_course/meet-snowflake.html')).toEqual({ kind: 'allow' });
    expect(decideNavigation('https://www.datafordummies.in/index.html')).toEqual({ kind: 'allow' });
    expect(decideNavigation('about:blank')).toEqual({ kind: 'allow' });
  });

  it('upgrades http site links to https', () => {
    expect(decideNavigation('http://datafordummies.in/terms.html')).toEqual({
      kind: 'redirect',
      url: 'https://datafordummies.in/terms.html',
    });
  });

  it.each([
    ['https://datafordummies.in/pricing.html', '/pro'],
    ['https://datafordummies.in/PRICING.HTML?plan=weekly', '/pro'],
    ['https://datafordummies.in/auth/login.html', '/sign-in'],
    ['https://datafordummies.in/auth/signup.html', '/sign-up'],
    ['https://datafordummies.in/auth/verify.html?email=a%40b.c', '/verify'],
    ['https://datafordummies.in/auth/reset-password.html', '/forgot-password'],
    ['https://datafordummies.in/auth/update-password.html', '/forgot-password'],
    ['https://datafordummies.in/auth/profile.html?subscription=return', '/account'],
    ['https://rzp.io/i/abc', '/pro'],
    ['https://api.razorpay.com/v1/checkout', '/pro'],
    ['https://checkout.razorpay.com/v1/checkout.js', '/pro'],
    ['https://razorpay.me/@fktech', '/pro'],
  ])('sends %s to the native %s screen', (url, route) => {
    expect(decideNavigation(url)).toEqual({ kind: 'native', route });
  });

  it('sends dataset files to the browser instead of the WebView', () => {
    expect(decideNavigation('https://datafordummies.in/data_science_course/datasets/titanic3.xlsx')).toEqual({
      kind: 'download',
      url: 'https://datafordummies.in/data_science_course/datasets/titanic3.xlsx',
    });
    expect(decideNavigation('https://datafordummies.in/mssql_course/datasets/Sales_Data_Sample.sql').kind).toBe('download');
  });

  it('asks before opening other websites and email', () => {
    expect(decideNavigation('https://www.youtube.com/@channel')).toEqual({ kind: 'external', url: 'https://www.youtube.com/@channel' });
    expect(decideNavigation('https://github.com/fkhambaty/datafordummies').kind).toBe('external');
    expect(decideNavigation('mailto:fktiindia@gmail.com').kind).toBe('external');
    expect(decideNavigation('https://datafordummies.in.evil.example/').kind).toBe('external');
  });

  it.each([
    'javascript:alert(document.cookie)',
    'intent://scan/#Intent;scheme=zxing;end',
    'file:///data/data/in.datafordummies.app/',
    'content://media/external',
    'market://details?id=x',
    'tel:+911234567890',
    'sms:123',
    'blob:https://datafordummies.in/4d2c',
    'data:text/html;base64,PHNjcmlwdD4=',
    'not a url',
  ])('blocks %s', (url) => {
    expect(decideNavigation(url).kind).toBe('block');
  });

  it('blocks off-site subframes but keeps site subframes', () => {
    expect(decideNavigation('https://ads.example/frame', false).kind).toBe('block');
    expect(decideNavigation('https://datafordummies.in/pricing.html', false)).toEqual({ kind: 'allow' });
  });
});
