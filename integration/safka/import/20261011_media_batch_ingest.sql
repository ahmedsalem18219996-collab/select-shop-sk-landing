-- TEMP SELECT SHOP only. Admin-only BULK INGEST of source-verifiable Safka media manifests.
-- This does NOT scrape suppliers, does NOT import arbitrary urls,
-- and cannot publish prices or place orders.
-- p_entries: [{ "id":"24-hex Product ID", "folder":"https://drive.google.com/drive/folders/...",
-- "videos":["https://drive.google.com/file/d/.../preview"], "status":"video_found|no_video"}]
CREATE OR REPLACE FUNCTION public.ss_safka_media_ingest_batch(p_entries jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE item jsonb; product_id text; folder text; mode text; videos jsonb; clip text;
        saved int:=0; clips int:=0; n int;
BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.ss_order_admins WHERE user_id=auth.uid()
 ) THEN RAISE EXCEPTION 'owner_required' USING ERRCODE='42501'; END IF;
 IF p_entries IS NULL OR jsonb_typeof(p_entries)<>'array' THEN
    RAISE EXCEPTION 'invalid_manifest' USING ERRCODE='22023'; END IF;
 n:=jsonb_array_length(p_entries);
 IF n<1 OR n>25 THEN RAISE EXCEPTION 'batch_size_1_to_25' USING ERRCODE='22023'; END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(p_entries) LOOP
  IF jsonb_typeof(item)<>'object' THEN
   RAISE EXCEPTION 'invalid_entry' USING ERRCODE='22023'; END IF;
  product_id:=item->>'id'; folder:=item->>'folder';mode:=item->>'status';videos:=item->'videos';
  IF product_id IS NULL OR product_id !~ '^[a-f0-9]{24}$' OR
     NOT EXISTS(SELECT 1 FROM public.ss_safka_import_products WHERE supplier_product_id=product_id)
  THEN RAISE EXCEPTION 'unknown_supplier_product' USING ERRCODE='22023'; END IF;
  IF folder IS NULL OR folder !~ '^https://drive[.]google[.]com/drive/folders/[A-Za-z0-9_-]{15,}([?][A-Za-z0-9_=&%-]{0,120})?$'
  THEN RAISE EXCEPTION 'invalid_source_folder' USING ERRCODE='22023'; END IF;
  IF mode NOT IN ('video_found','no_video') OR mode IS NULL
  THEN RAISE EXCEPTION 'invalid_media_state' USING ERRCODE='22023'; END IF;
  IF videos IS NULL OR jsonb_typeof(videos)<>'array' OR jsonb_array_length(videos)>40
  THEN RAISE EXCEPTION 'invalid_video_list' USING ERRCODE='22023'; END IF;
  IF mode='video_found' AND jsonb_array_length(videos)=0
  THEN RAISE EXCEPTION 'missing_verified_video' USING ERRCODE='22023'; END IF;
  IF mode='no_video' AND jsonb_array_length(videos)>0
  THEN RAISE EXCEPTION 'inconsistent_media_status' USING ERRCODE='22023'; END IF;
  FOR clip IN SELECT value #>> '{}' FROM jsonb_array_elements(videos) LOOP
   IF clip IS NULL OR clip !~ '^https://drive[.]google[.]com/file/d/[A-Za-z0-9_-]{15,}/preview$'
   THEN RAISE EXCEPTION 'invalid_video_source' USING ERRCODE='22023'; END IF;
  END LOOP;
  IF mode='no_video' AND EXISTS (
    SELECT 1 FROM public.ss_safka_verified_media m
    WHERE m.supplier_product_id=product_id AND jsonb_array_length(m.videos)>0
  ) THEN RAISE EXCEPTION 'cannot_erase_verified_video' USING ERRCODE='23514'; END IF;
  IF mode='video_found' THEN
   INSERT INTO public.ss_safka_verified_media(supplier_product_id,videos,source_folder_url)
   VALUES(product_id,videos,folder)
   ON CONFLICT(supplier_product_id) DO UPDATE
   SET videos=excluded.videos,source_folder_url=excluded.source_folder_url,verified_at=now();
  END IF;
  INSERT INTO public.ss_safka_media_inventory(
    supplier_product_id,source_folder_url,status,video_count,checked_at,notes
  ) VALUES(product_id,folder,mode,jsonb_array_length(videos),now(),'Source-folder and Drive IDs reviewed')
  ON CONFLICT(supplier_product_id) DO UPDATE
   SET source_folder_url=excluded.source_folder_url,status=excluded.status,
       video_count=excluded.video_count,checked_at=excluded.checked_at,notes=excluded.notes;
  saved:=saved+1; clips:=clips+jsonb_array_length(videos);
 END LOOP;
 RETURN jsonb_build_object('saved',saved,'clips',clips);
END; $fn$;
REVOKE ALL ON FUNCTION public.ss_safka_media_ingest_batch(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ss_safka_media_ingest_batch(jsonb) TO authenticated;
