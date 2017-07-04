#!/usr/bin/env python3
from werkzeug.urls import url_decode
from flask import Flask, url_for, render_template, flash, request, session, jsonify, redirect
import sys, traceback
from flask_oauthlib.client import OAuth
from uuid import uuid4
from flask.ext.sqlalchemy import SQLAlchemy
from flask_oauthlib.client import OAuthException
import time
import requests
import json

app=Flask(__name__)
app.secret_key = str(uuid4())
db=SQLAlchemy(app)

with open("../../pw.json") as f:
    pws=json.load(f)

app.config['GOOGLE_ID'] = pws["GOOGLE_ID"]
app.config['GOOGLE_SECRET'] = pws["GOOGLE_SECRET"]
oauth = OAuth(app)
google = oauth.remote_app(
    'google',
    consumer_key=app.config.get('GOOGLE_ID'),
    consumer_secret=app.config.get('GOOGLE_SECRET'),
    request_token_params={
        'scope' : "openid"# 'email'
    },
    base_url='https://www.googleapis.com/oauth2/v1/',
    request_token_url=None,
    access_token_method='POST',
    access_token_url='https://accounts.google.com/o/oauth2/token',
    authorize_url='https://accounts.google.com/o/oauth2/auth',
)

@app.errorhandler(404)
def e404(e):
    return render_template("error.html",e=e), 404

@app.errorhandler(400)
def e400(e):
    return render_template("error.html",e=e), 400

@app.errorhandler(500)
def e500(e):
    return render_template("error.html",e=e), 500

@app.route("/googleperms/<perm>/<redir>/")
def googleperm(perm,redir):
    global google
    permdict={
              "driveread":"https://www.googleapis.com/auth/drive.file",
              "openid":"openid"
             }

    oauth.remote_apps.pop("google",None)
    google = oauth.remote_app(
        'google',
        consumer_key=app.config.get('GOOGLE_ID'),
        consumer_secret=app.config.get('GOOGLE_SECRET'),
        request_token_params={ "scope":permdict[perm] },
        base_url='https://www.googleapis.com/oauth2/v1/',
        request_token_url=None,
        access_token_method='POST',
        access_token_url='https://accounts.google.com/o/oauth2/token',
        authorize_url='https://accounts.google.com/o/oauth2/auth',
    )
    google._tokengetter=get_google_oauth_token
    oauth.remote_apps["google"]=google
    return google.authorize(callback=url_for(redir,_external=True))

@app.route('/',methods=["GET","POST"])
def index():
    #try:
    #    flash(google.get("userinfo").data)
    #except Exception as e:
    #    flash(e)
    return render_template("index.html")

def google_oauth():
    try:
        resp = google.authorized_response()
        session["google_token"] = resp["access_token"]
        new_oauth=True
    except:
        new_oauth=False
    try:
        ui=google.get("userinfo")
        if ui.status in range(200,300):
            session["google_userinfo"]=ui.data
        ti=google.get("tokeninfo?access_token=%s" % resp["access_token"])
        if ti.status in range(200,300):
            session["google_tokeninfo"]=ti.data
            session["google_tokenexpire"]=time.time()+ti.data.get("expires_in",3600)
    except:
        return new_oauth, {}
    return new_oauth, {"userinfo":ui, "tokeninfo":ti}

@app.route('/profile/')
def profile():
    new_oauth, status = google_oauth()
    if "google_userinfo" not in session:
        return redirect(url_for("index"))
    return render_template("profile.html",info=session["google_userinfo"])

@app.route('/files/')
def files():
    ual=request.headers.get("User-Agent").lower()
    if not ("chrome" in ual or "firefox" in ual or "safari" in ual):
        flash("Please get a real browser","danger")
    new_oauth,status = google_oauth()
    gtx="google_tokenexpire"
    if gtx in session and time.time()>session[gtx]:
        session.pop("google_tokeninfo",None)
        session.pop(gtx,None)
    return render_template("files.html")

@app.route('/googlelogin/')
def googlelogin():
    return redirect(url_for("googleperm",perm="openid",redir="profile"))

   # return google.authorize(callback=url_for('authorized', _external=True))

@app.route('/requestinfo/')
def requestinfo():
    return request.headers.get('User-Agent')
    return request.environ.get('REMOTE_ADDR')

@app.route('/login/authorized')
def authorized():
    resp = google.authorized_response()
    if resp is None:
        flash('Access denied: reason=%s error=%s' % (
            request.args['error_reason'],
            request.args['error_description']
        ),"error")
        redirect(url_for("index"))
    session['google_token'] = (resp['access_token'], '')
    me = google.get('userinfo')
    #return jsonify({"data": me.data})
    return redirect(url_for("profile"))


@google.tokengetter
def get_google_oauth_token():
    return (session.get('google_token'),"")


@app.route('/logout')
def logout():
    session.pop('google_userinfo', None)
    return redirect(url_for('index'))

if __name__=="__main__":
    app.run(host="0.0.0.0",port=2320,debug=True)
