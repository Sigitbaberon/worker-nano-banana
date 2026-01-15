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

      // LANGKAH 1: Buat Tugas (Text to Image)
      const createTask = await fetch("https://api.digen.ai/v2/tools/text_to_image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Digen-Token": token,
          "Digen-Platform": "web",
          "Digen-DeviceID": "51bc72ce3cb6c0f7767b312da3566f63"
        },
        body: JSON.stringify({
          "image_size": "768x1368",
          "prompt": prompt,
          "model": "image_motion",
          "batch_size": 1,
          "strength": "0.9"
        })
      });

      const taskData = await createTask.json();
      const jobID = taskData.data?.id;

      if (!jobID) throw new Error("Gagal mendapatkan Job ID");

      // LANGKAH 2: Polling (Menunggu Hasil)
      // Sesuai log Anda, status 3 adalah sukses. Kita akan cek setiap 5 detik.
      let resultUrl = null;
      let attempts = 0;

      while (attempts < 20) { // Maksimal tunggu ~100 detik
        await new Promise(r => setTimeout(r, 5000));
        
        const checkStatus = await fetch("https://api.digen.ai/v6/video/get_task_v2", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Digen-Token": token
          },
          body: JSON.stringify({ "jobID": jobID })
        });

        const statusData = await checkStatus.json();
        
        if (statusData.data?.status === 3 && statusData.data?.resource_urls?.length > 0) {
          resultUrl = statusData.data.resource_urls[0];
          break;
        }
        attempts++;
      }

      if (!resultUrl) throw new Error("Proses AI terlalu lama (Timeout)");

      // LANGKAH 3: Berikan hasil ke Git44
      return new Response(JSON.stringify({ result: resultUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });

    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), { 
        status: 500, 
        headers: corsHeaders 
      });
    }
  }
};
