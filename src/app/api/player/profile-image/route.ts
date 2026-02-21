import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServer';

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get player record to verify they have access
  const { data: playerRecord } = await supabase
    .from('players')
    .select('id, role')
    .eq('auth_user_id', user.id)
    .single();

  if (!playerRecord) {
    return NextResponse.json({ error: 'Player record not found' }, { status: 404 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 });
    }

    // Validate file size (max 500KB)
    if (file.size > 500 * 1024) {
      return NextResponse.json({ error: 'File size must be less than 500KB' }, { status: 400 });
    }

    // Create a unique filename with user folder for security
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${user.id}/${fileName}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    const imageUrl = urlData.publicUrl;

    // Update player record with new image URL
    const { error: updateError } = await supabase
      .from('players')
      .update({ profile_image_url: imageUrl })
      .eq('id', playerRecord.id);

    if (updateError) {
      console.error('Update error:', updateError);
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
    }

    return NextResponse.json({ imageUrl });
  } catch (error) {
    console.error('Profile image upload error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
