const cron = require('node-cron');
const Grievance = require('../models/Grievance');

function startEscalationJob() {
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      
      const ticketsToEscalate = await Grievance.find({
        status: { $in: ['Pending', 'In Progress'] },
        deadline: { $lt: now },
        assignedOfficial: { $ne: 'Supervising Official' }
      });

      if (ticketsToEscalate.length === 0) {
        return;
      }

      console.log(`[Escalation Job] Found ${ticketsToEscalate.length} tickets to escalate`);

      for (let ticket of ticketsToEscalate) {
        ticket.escalationLevel = (ticket.escalationLevel || 0) + 1;
        ticket.assignedOfficial = 'Supervising Official';
        
        ticket.history.push({
          action: `Escalated to Supervising Official (Level ${ticket.escalationLevel})`,
          actor: 'System Escalation Engine',
          note: `Resolution deadline (${new Date(ticket.deadline).toLocaleString()}) exceeded.`,
          timestamp: new Date()
        });

        await ticket.save();
        console.log(`[Escalation Job] Escalated ticket ID: ${ticket.grievanceId.slice(-8)}`);
      }

    } catch (err) {
      console.error('[Escalation Job] Error running cron:', err);
    }
  });
  console.log('✅ Escalation Engine started. Monitoring past-deadline tickets.');
}

module.exports = { startEscalationJob };
