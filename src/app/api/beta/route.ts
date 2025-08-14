import { NextRequest, NextResponse } from 'next/server';

type BetaSignupBody = {
  name?: string;
  phone?: string;
};

function getEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value : undefined;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as BetaSignupBody;

    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const phone = typeof body.phone === 'string' ? body.phone.trim() : '';

    if (!name || !phone) {
      return NextResponse.json(
        { success: false, error: 'Missing name or phone' },
        { status: 400 }
      );
    }

    // Hardcode everything except the token
    const tableId = 'm4c0hsxmy9iiwmf';
    const baseUrl = 'https://app.nocodb.com/api/v2';
    const nocodbUrl = `${baseUrl}/tables/${tableId}/records`;
    const apiToken = getEnv('NOCODB_API_TOKEN');
    if (!apiToken) {
      return NextResponse.json(
        { success: false, error: 'Server not configured for NocoDB (missing NOCODB_API_TOKEN)' },
        { status: 500 }
      );
    }

    // Send with canonical NocoDB-style field keys (PascalCase) to avoid case/title mismatches
    const primaryPayload: Record<string, string> = { name: name, phoneNumber: phone };

    const res = await fetch(nocodbUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xc-token': apiToken,
        'Accept': 'application/json',
      },
      body: JSON.stringify([primaryPayload]),
    });

    const json = await res.json().catch(() => undefined);
    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: 'Failed to create record in NocoDB', detail: json },
        { status: 502 }
      );
    }

    const testflightLink = getEnv('TESTFLIGHT_LINK') || null;

    return NextResponse.json({ success: true, testflightLink });
  } catch (error) {
    console.error('[BETA_SIGNUP] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}


