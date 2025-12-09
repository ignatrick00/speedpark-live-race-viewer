import Notification from '@/models/Notification';
import emailService from './emailService';

interface CreateNotificationParams {
  userId: string;
  userEmail: string;
  userName: string;
  type: 'class_cancelled_by_coach' | 'booking_cancelled_by_student';
  classData: {
    classId?: string;
    date: string;
    startTime: string;
    endTime: string;
    coachName?: string;
    studentName?: string;
  };
}

class NotificationService {
  /**
   * Create in-app notification and send email when a student cancels their booking
   */
  async notifyCoachOfCancellation(params: CreateNotificationParams): Promise<void> {
    const { userId, userEmail, userName, classData } = params;
    const { date, startTime, endTime, studentName } = classData;

    // Format date for display
    const formattedDate = new Date(date).toLocaleDateString('es-CL', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    // Create in-app notification
    await Notification.create({
      userId,
      type: 'booking_cancelled_by_student',
      title: 'Reserva Cancelada',
      message: `${studentName} canceló su reserva para la clase del ${formattedDate} a las ${startTime}`,
      metadata: {
        classId: classData.classId,
        date,
        startTime,
        endTime,
        cancelledBy: studentName || 'Alumno',
        cancelledByRole: 'student',
        studentName,
      },
      read: false,
    });

    // Send email notification
    const html = this.generateCoachCancellationEmailHTML({
      coachName: userName,
      studentName: studentName || 'Un alumno',
      date: formattedDate,
      startTime,
      endTime,
    });

    const text = `
Hola ${userName},

${studentName} ha cancelado su reserva para tu clase.

📅 Fecha: ${formattedDate}
🕐 Horario: ${startTime} - ${endTime}

El cupo ahora está disponible para otros alumnos.

Saludos,
Karteando.cl
    `;

    await emailService.sendEmail({
      to: userEmail,
      subject: '📢 Reserva Cancelada - Karteando.cl',
      html,
      text,
    });
  }

  /**
   * Create in-app notifications and send emails when a coach cancels a class
   */
  async notifyStudentsOfCancellation(
    students: Array<{ userId: string; email: string; name: string }>,
    classData: {
      classId?: string;
      date: string;
      startTime: string;
      endTime: string;
      coachName: string;
    }
  ): Promise<void> {
    const { date, startTime, endTime, coachName } = classData;

    // Format date for display
    const formattedDate = new Date(date).toLocaleDateString('es-CL', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    // Create notifications and send emails for each student
    const promises = students.map(async (student) => {
      // Create in-app notification
      await Notification.create({
        userId: student.userId,
        type: 'class_cancelled_by_coach',
        title: 'Clase Cancelada',
        message: `Tu clase con ${coachName} del ${formattedDate} a las ${startTime} ha sido cancelada`,
        metadata: {
          classId: classData.classId,
          date,
          startTime,
          endTime,
          cancelledBy: coachName,
          cancelledByRole: 'coach',
          coachName,
        },
        read: false,
      });

      // Send email notification
      const html = this.generateStudentCancellationEmailHTML({
        studentName: student.name,
        coachName,
        date: formattedDate,
        startTime,
        endTime,
      });

      const text = `
Hola ${student.name},

Lamentamos informarte que tu clase ha sido cancelada.

👨‍🏫 Coach: ${coachName}
📅 Fecha: ${formattedDate}
🕐 Horario: ${startTime} - ${endTime}

Puedes reservar otra clase disponible desde la plataforma.

Disculpas por las molestias,
Karteando.cl
      `;

      await emailService.sendEmail({
        to: student.email,
        subject: '⚠️ Clase Cancelada - Karteando.cl',
        html,
        text,
      });
    });

    await Promise.all(promises);
  }

  /**
   * Generate HTML email for coach cancellation notification
   */
  private generateCoachCancellationEmailHTML(params: {
    coachName: string;
    studentName: string;
    date: string;
    startTime: string;
    endTime: string;
  }): string {
    const { coachName, studentName, date, startTime, endTime } = params;

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body {
              font-family: 'Arial', sans-serif;
              background-color: #0a0e27;
              color: #e0e7ff;
              margin: 0;
              padding: 0;
            }
            .container {
              max-width: 600px;
              margin: 40px auto;
              background: linear-gradient(135deg, #1a1f3a 0%, #0a0e27 100%);
              border: 2px solid #00d9ff;
              border-radius: 12px;
              overflow: hidden;
              box-shadow: 0 0 30px rgba(0, 217, 255, 0.3);
            }
            .header {
              background: linear-gradient(90deg, #00d9ff 0%, #7dd3fc 100%);
              padding: 30px;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              color: #0a0e27;
              font-size: 32px;
              font-weight: bold;
              letter-spacing: 2px;
            }
            .content {
              padding: 40px 30px;
            }
            .content h2 {
              color: #00d9ff;
              font-size: 24px;
              margin-bottom: 20px;
            }
            .content p {
              line-height: 1.8;
              margin-bottom: 20px;
              color: #cbd5e1;
            }
            .info-box {
              background-color: rgba(0, 217, 255, 0.1);
              border-left: 4px solid #00d9ff;
              padding: 20px;
              margin: 20px 0;
              border-radius: 4px;
            }
            .info-box p {
              margin: 8px 0;
            }
            .footer {
              background-color: #0a0e27;
              padding: 20px;
              text-align: center;
              font-size: 12px;
              color: #64748b;
              border-top: 1px solid #1e293b;
            }
            .racing-stripe {
              height: 4px;
              background: repeating-linear-gradient(
                90deg,
                #00d9ff 0px,
                #00d9ff 20px,
                #0a0e27 20px,
                #0a0e27 40px
              );
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="racing-stripe"></div>
            <div class="header">
              <h1>🏁 KARTEANDO.CL</h1>
            </div>
            <div class="content">
              <h2>Reserva Cancelada 📢</h2>
              <p>Hola <strong>${coachName}</strong>,</p>
              <p>
                Te informamos que <strong>${studentName}</strong> ha cancelado su reserva para una de tus clases.
              </p>
              <div class="info-box">
                <p><strong>📅 Fecha:</strong> ${date}</p>
                <p><strong>🕐 Horario:</strong> ${startTime} - ${endTime}</p>
                <p><strong>👤 Alumno:</strong> ${studentName}</p>
              </div>
              <p>
                El cupo ahora está disponible nuevamente para que otros alumnos puedan reservar.
              </p>
            </div>
            <div class="footer">
              <p>© 2025 Karteando.cl - Plataforma de Karting Competitivo</p>
              <p>¡Nos vemos en la pista! 🏁</p>
            </div>
            <div class="racing-stripe"></div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Generate HTML email for student cancellation notification
   */
  private generateStudentCancellationEmailHTML(params: {
    studentName: string;
    coachName: string;
    date: string;
    startTime: string;
    endTime: string;
  }): string {
    const { studentName, coachName, date, startTime, endTime } = params;
    const baseUrl = (process.env.NEXTAUTH_URL || 'https://karteando.cl').trim();

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body {
              font-family: 'Arial', sans-serif;
              background-color: #0a0e27;
              color: #e0e7ff;
              margin: 0;
              padding: 0;
            }
            .container {
              max-width: 600px;
              margin: 40px auto;
              background: linear-gradient(135deg, #1a1f3a 0%, #0a0e27 100%);
              border: 2px solid #ef4444;
              border-radius: 12px;
              overflow: hidden;
              box-shadow: 0 0 30px rgba(239, 68, 68, 0.3);
            }
            .header {
              background: linear-gradient(90deg, #ef4444 0%, #dc2626 100%);
              padding: 30px;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              color: #fff;
              font-size: 32px;
              font-weight: bold;
              letter-spacing: 2px;
            }
            .content {
              padding: 40px 30px;
            }
            .content h2 {
              color: #ef4444;
              font-size: 24px;
              margin-bottom: 20px;
            }
            .content p {
              line-height: 1.8;
              margin-bottom: 20px;
              color: #cbd5e1;
            }
            .info-box {
              background-color: rgba(239, 68, 68, 0.1);
              border-left: 4px solid #ef4444;
              padding: 20px;
              margin: 20px 0;
              border-radius: 4px;
            }
            .info-box p {
              margin: 8px 0;
            }
            .button {
              display: inline-block;
              padding: 15px 40px;
              background: linear-gradient(90deg, #00d9ff 0%, #7dd3fc 100%);
              color: #0a0e27;
              text-decoration: none;
              border-radius: 8px;
              font-weight: bold;
              font-size: 18px;
              text-align: center;
              margin: 20px 0;
              letter-spacing: 1px;
            }
            .footer {
              background-color: #0a0e27;
              padding: 20px;
              text-align: center;
              font-size: 12px;
              color: #64748b;
              border-top: 1px solid #1e293b;
            }
            .racing-stripe {
              height: 4px;
              background: repeating-linear-gradient(
                90deg,
                #ef4444 0px,
                #ef4444 20px,
                #0a0e27 20px,
                #0a0e27 40px
              );
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="racing-stripe"></div>
            <div class="header">
              <h1>⚠️ KARTEANDO.CL</h1>
            </div>
            <div class="content">
              <h2>Clase Cancelada</h2>
              <p>Hola <strong>${studentName}</strong>,</p>
              <p>
                Lamentamos informarte que tu clase ha sido cancelada por el coach.
              </p>
              <div class="info-box">
                <p><strong>👨‍🏫 Coach:</strong> ${coachName}</p>
                <p><strong>📅 Fecha:</strong> ${date}</p>
                <p><strong>🕐 Horario:</strong> ${startTime} - ${endTime}</p>
              </div>
              <p>
                Disculpa las molestias. Puedes buscar y reservar otra clase disponible desde la plataforma.
              </p>
              <div style="text-align: center;">
                <a href="${baseUrl}/clases" class="button">
                  VER CLASES DISPONIBLES
                </a>
              </div>
            </div>
            <div class="footer">
              <p>© 2025 Karteando.cl - Plataforma de Karting Competitivo</p>
              <p>¡Nos vemos en la pista! 🏁</p>
            </div>
            <div class="racing-stripe"></div>
          </div>
        </body>
      </html>
    `;
  }
}

// Singleton instance
const notificationService = new NotificationService();

export default notificationService;
