from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime

from app.database import get_db
from app.models import User, DailyCheckin, DailyReward
from app.schemas import GamificationResponse, DailyCheckinStatus, DailyCheckinResult

gamification_router = APIRouter(prefix="/gamification", tags=["gamification"])

@gamification_router.get("/", response_model=GamificationResponse)
def get_gamification_data():
    # TODO: Implement actual gamification logic
    return {
        'daily_reward': 100,
        'games_available': 3,
        'special_discount': '20% off',
        'flash_sale': 'Ends in 2 hours'
    }

@gamification_router.get("/daily-checkin-status", response_model=DailyCheckinStatus)
def get_daily_checkin_status(db: Session = Depends(get_db)):
    # TODO: Implement proper user authentication
    user = db.query(User).filter(User.id == 1).first()  # Assuming user with ID 1 for now
    today = datetime.utcnow().date()
    
    last_checkin = db.query(DailyCheckin).filter(
        DailyCheckin.user_id == user.id
    ).order_by(DailyCheckin.date.desc()).first()
    
    if last_checkin and last_checkin.date == today:
        return {
            'current_streak': last_checkin.streak,
            'can_checkin': False
        }
    
    can_checkin = not last_checkin or (today - last_checkin.date).days == 1
    current_streak = last_checkin.streak if last_checkin and can_checkin else 0
    
    return {
        'current_streak': current_streak,
        'can_checkin': can_checkin
    }

@gamification_router.post("/daily-checkin", response_model=DailyCheckinResult)
def perform_daily_checkin(db: Session = Depends(get_db)):
    # TODO: Implement proper user authentication
    user = db.query(User).filter(User.id == 1).first()  # Assuming user with ID 1 for now
    today = datetime.utcnow().date()
    
    last_checkin = db.query(DailyCheckin).filter(
        DailyCheckin.user_id == user.id
    ).order_by(DailyCheckin.date.desc()).first()
    
    if last_checkin and last_checkin.date == today:
        raise HTTPException(status_code=400, detail="Already checked in today")
    
    if last_checkin and (today - last_checkin.date).days == 1:
        new_streak = last_checkin.streak + 1
    else:
        new_streak = 1
    
    checkin = DailyCheckin(user_id=user.id, date=today, streak=new_streak)
    db.add(checkin)
    
    coins_earned = min(50, 5 * new_streak)  # Cap at 50 coins
    user.coins += coins_earned
    
    reward = DailyReward(user_id=user.id, coins_rewarded=coins_earned, date=today)
    db.add(reward)
    
    db.commit()
    
    return {
        'new_streak': new_streak,
        'coins_earned': coins_earned
    } 