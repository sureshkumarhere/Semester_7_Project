import { useState } from 'react';

export default function ComplaintForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobile: '',
    location: '',
    roomNo: '',
    preferredTimeFrom: '9:00 AM',
    preferredTimeTo: '12:30 PM',
    problemType: '',
    comment: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    alert('Complaint submitted successfully!');
  };

  return (
    <div className="form-wrapper">
      <h2>Submit Complaint</h2>
      <form onSubmit={handleSubmit} className="complaint-form">
        <div className="form-group">
          <label>Name*</label>
          <input type="text" name="name" required value={formData.name} onChange={handleChange} />
        </div>

        <div className="form-group">
          <label>Email*</label>
          <input type="email" name="email" required value={formData.email} onChange={handleChange} />
        </div>

        <div className="form-group">
          <label>Mobile Number*</label>
          <input type="tel" name="mobile" required value={formData.mobile} onChange={handleChange} />
        </div>

        <div className="form-group">
          <label>Location*</label>
          <select name="location" required value={formData.location} onChange={handleChange}>
            <option value="">---------</option>
            <option value="SVBH">SVBH Hostel</option>
            <option value="Tandon">Tandon Hostel</option>
            <option value="Computer Center">Computer Center</option>
          </select>
        </div>

        <div className="form-group">
          <label>Address Room No*</label>
          <input type="text" name="roomNo" required value={formData.roomNo} onChange={handleChange} />
        </div>

        <div className="form-group">
          <label>Preferred time from*</label>
          <select name="preferredTimeFrom" value={formData.preferredTimeFrom} onChange={handleChange}>
            <option value="9:00 AM">9:00 AM</option>
            <option value="2:00 PM">2:00 PM</option>
          </select>
        </div>

        <div className="form-group">
          <label>To*</label>
          <select name="preferredTimeTo" value={formData.preferredTimeTo} onChange={handleChange}>
            <option value="12:30 PM">12:30 PM</option>
            <option value="5:30 PM">5:30 PM</option>
          </select>
        </div>

        <div className="form-group">
          <label>Problem Type*</label>
          <select name="problemType" required value={formData.problemType} onChange={handleChange}>
            <option value="">---------</option>
            <option value="Wi-Fi">Wi-Fi Disconnection</option>
            <option value="LAN">LAN Port Fault</option>
            <option value="Speed">Slow Speed</option>
          </select>
        </div>

        <div className="form-group">
          <label>Additional Comment</label>
          <input type="text" name="comment" value={formData.comment} onChange={handleChange} />
        </div>

        <button type="submit" className="submit-btn">Submit</button>
      </form>
    </div>
  );
}