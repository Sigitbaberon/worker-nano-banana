export default {
  async fetch(request, env, ctx) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Digen-Token, DIGEN-SessionID, DIGEN-Language, DIGEN-Platform, DIGEN-DeviceID",
    };

    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    try {
      const { prompt } = await request.json();
      
      // Menggunakan data asli dari log Anda
      const token = "4d6574614147492e47656e495873759577ba60fecfceb452e6194d982c:2445090:1768457738";
      const sessionID = "c9b5b506-d9c8-42ec-a66d-5a4dc0ea9bd4"; // Harus ada agar tidak error 4004
      const deviceID = "51bc72ce3cb6c0f7767b312da3566f63";

      // 1. Create Task
      const createTask = await fetch("https://api.digen.ai/v2/tools/text_to_image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Digen-Token": token,
          "DIGEN-SessionID": sessionID,
          "DIGEN-DeviceID": deviceID,
          "Digen-Platform": "web",
          "Digen-Language": "id-ID"
        },
        body: JSON.stringify({
          "image_size": "768x1368",
          "width": 768,
          "height": 1368,
          "prompt": prompt,
          "batch_size": 1,
          "strength": "0.9",
          "model": "image_motion",
          "resolution_model": "9:16"
        })
      });

      const taskData = await createTask.json();
      const jobID = taskData.data?.id;

      if (!jobID) {
        return new Response(JSON.stringify({ error: "Gagal mendapatkan Job ID", detail: taskData }), { status: 500, headers: corsHeaders });
      }

      // 2. Polling (Cek Status)
      let resultUrl = null;
      for (let i = 0; i < 15; i++) {
        await new Promise(r => setTimeout(r, 4000)); // Tunggu 4 detik
        
        const check = await fetch("https://api.digen.ai/v6/video/get_task_v2", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Digen-Token": token,
            "DIGEN-SessionID": sessionID
          },
          body: JSON.stringify({ "jobID": jobID })
        });

        const statusData = await check.json();
        if (statusData.data?.status === 3 && statusData.data?.resource_urls?.length > 0) {
          resultUrl = statusData.data.resource_urls[0];
          break;
        }
      }

      if (!resultUrl) throw new Error("Timeout rendering");

      return new Response(JSON.stringify({ result: resultUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });

    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
    }
  }
};
