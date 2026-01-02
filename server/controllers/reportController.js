import Booking from '../models/Booking.js'
import ParkingSpot from '../models/ParkingSpots.js'
import User from '../models/User.js'

const parseRange = (fromStr, toStr) => {
  const now = new Date()
  const to = toStr ? new Date(toStr) : new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
  const fromDefault = new Date(to)
  fromDefault.setDate(fromDefault.getDate() - 6)
  const from = fromStr ? new Date(fromStr) : new Date(fromDefault.getFullYear(), fromDefault.getMonth(), fromDefault.getDate(), 0, 0, 0, 0)
  return { from, to }
}

const clamp = (start, end, from, to) => {
  const s = start < from ? from : start
  const e = end > to ? to : end
  return e > s ? { s, e } : null
}

export const getOverview = async (req, res) => {
  try {
    const { from: qFrom, to: qTo } = req.query
    const { from, to } = parseRange(qFrom, qTo)

    const revenueDaily = await Booking.aggregate([
      { $match: { paymentStatus: 'paid', chargedAt: { $gte: from, $lte: to } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$chargedAt' } }, total: { $sum: { $ifNull: ['$chargedAmount', 0] } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ])
    const revenueTotal = revenueDaily.reduce((acc, d) => acc + d.total, 0)

    const bookingsForUsage = await Booking.find({
      $expr: {
        $and: [
          { $lt: [{ $ifNull: ['$actualEntryTime', '$startTime'] }, to] },
          { $gt: [{ $ifNull: ['$actualExitTime', '$endTime'] }, from] }
        ]
      }
    }).select('actualEntryTime actualExitTime startTime endTime')

    const hours = Array(24).fill(0)
    let occupiedHours = 0
    for (const b of bookingsForUsage) {
      const start = b.actualEntryTime || b.startTime
      const end = b.actualExitTime || b.endTime
      if (!start || !end) continue
      const clamped = clamp(new Date(start), new Date(end), from, to)
      if (!clamped) continue
      const { s, e } = clamped
      const msInHour = 3600000
      const startHour = new Date(s.getFullYear(), s.getMonth(), s.getDate(), s.getHours())
      for (let t = startHour.getTime(); t < e.getTime(); t += msInHour) {
        const h = new Date(t).getHours()
        hours[h] += 1
        occupiedHours += 1
      }
    }

    const totalSpots = await ParkingSpot.countDocuments()
    const totalHours = Math.max(1, Math.ceil((to.getTime() - from.getTime()) / 3600000))
    const availableSpotHours = Math.max(1, totalSpots * totalHours)
    const averageOccupancyRate = availableSpotHours > 0 ? occupiedHours / availableSpotHours : 0

    const usersDaily = await User.aggregate([
      { $match: { createdAt: { $gte: from, $lte: to } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ])

    const bookingsByUser = await Booking.aggregate([
      { $match: { createdAt: { $gte: from, $lte: to } } },
      { $group: { _id: '$user', count: { $sum: 1 } } }
    ])
    const repeatCustomersCount = bookingsByUser.filter(b => b.count >= 2).length
    const totalCustomersInRange = bookingsByUser.length
    const repeatCustomersPercentage = totalCustomersInRange > 0 ? repeatCustomersCount / totalCustomersInRange : 0

    const vehicleDist = await Booking.aggregate([
      { $match: { createdAt: { $gte: from, $lte: to } } },
      { $group: { _id: { $ifNull: ['$vehicle.carType', '$vehicleType'] }, count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ])

    res.json({
      range: { from, to },
      revenue: {
        currency: process.env.PAYMENT_CURRENCY || 'bdt',
        total: revenueTotal,
        daily: revenueDaily.map(d => ({ date: d._id, total: d.total, count: d.count }))
      },
      usage: {
        peakHours: hours.map((c, i) => ({ hour: i, count: c })),
        averageOccupancyRate
      },
      customers: {
        newUsersDaily: usersDaily.map(d => ({ date: d._id, count: d.count })),
        repeatCustomers: { count: repeatCustomersCount, percentage: repeatCustomersPercentage },
        vehicleTypeDistribution: vehicleDist.map(v => ({ type: v._id || 'Unknown', count: v.count }))
      }
    })
  } catch (e) {
    res.status(500).json({ message: 'Failed to generate report', error: e.message })
  }
}
