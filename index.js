export default {
  async fetch(request, env, ctx) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Digen-Token, DIGEN-SessionID",
    };

    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    try {
      const { prompt } = await request.json();
      const token = "4d6574614147492e47656e495873759577ba60fecfceb452e6194d982c:2445090:1768457738";
      const sessionID = "c9b5b506-d9c8-42ec-a66d-5a4dc0ea9bd4";

      // 1. Create Task
      const createTask = await fetch("https://api.digen.ai/v2/tools/text_to_image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Digen-Token": token,
          "DIGEN-SessionID": sessionID,
          "DIGEN-DeviceID": "51bc72ce3cb6c0f7767b312da3566f63",
          "Digen-Platform": "web"
        },
        body: JSON.stringify({
          "image_size": "768x1368",
          "prompt": prompt,
          "model": "image_motion",
          "batch_size": 1
        })
      });

      const taskData = await createTask.json();
      const jobID = taskData.data?.id;

      if (!jobID) throw new Error("Digen busy or down");

      // 2. Polling Cepat (Hanya 4 kali percobaan agar tidak timeout di Supabase)
      let resultUrl = null;
      for (let i = 0; i < 5; i++) {
        await new Promise(r => setTimeout(r, 4000)); // Cek setiap 4 detik
        
        const check = await fetch("https://api.digen.ai/v6/video/get_task_v2", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Digen-Token": token },
          body: JSON.stringify({ "jobID": jobID })
        });

        const statusData = await check.json();
        if (statusData.data?.status === 3 && statusData.data?.resource_urls?.[0]) {
          resultUrl = statusData.data.resource_urls[0];
          break;
        }
      }

      // 3. Jika belum jadi dalam 20 detik, jangan kasih error 500!
      // Kasih pesan "Masih diproses" agar Git44 tidak menganggapnya mati.
      if (!resultUrl) {
         return new Response(JSON.stringify({ 
           result: "Sedang merender... Silakan klik 'Run' lagi dalam 10 detik atau cek riwayat. ID: " + jobID 
         }), {
           headers: { ...corsHeaders, "Content-Type": "application/json" }
         });
      }

      return new Response(JSON.stringify({ result: resultUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });

    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
    }
  }
};
